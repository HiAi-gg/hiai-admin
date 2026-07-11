import { z } from 'zod';
import { env } from '../../lib/config.js';
import { isPlaceholderSecret } from '../auth-events/auth-event.service.js';

export interface AuthIntegrationConfig {
  id: string;
  audience: string;
  issuer: string;
  secretRef: string;
  allowedOrigins: string[];
}

export interface IntegrationIdentityClaims {
  iss: string;
  aud: string;
  sub: string;
  email: string;
  name: string;
  emailVerified: true;
  jti: string;
  iat: number;
  exp: number;
}

interface RegisteredIntegration {
  config: AuthIntegrationConfig;
  signingSecret: string;
}

const MIN_INTEGRATION_SECRET_LENGTH = 32;

const integrationConfigSchema = z
  .array(
    z.object({
      id: z.string().trim().min(1, 'integration id must not be empty'),
      audience: z.string().trim().min(1, 'audience must not be empty'),
      issuer: z.string().trim().min(1, 'issuer must not be empty'),
      secretRef: z.string().trim().min(1, 'secretRef must not be empty'),
      allowedOrigins: z
        .array(z.string().trim().min(1), { invalid_type_error: 'allowedOrigins must be an array' })
        .min(1, 'allowedOrigins must contain at least one origin'),
    }),
  )
  .superRefine((entries, ctx) => {
    const seen = new Set<string>();
    for (const entry of entries) {
      if (seen.has(entry.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['integrations'],
          message: `Duplicate integration id "${entry.id}"`,
        });
      }
      seen.add(entry.id);
    }
  });

function parseAllowedOrigins(allowedOrigins: string[]) {
  for (const origin of allowedOrigins) {
    try {
      // eslint-disable-next-line no-new
      const parsed = new URL(origin);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        throw new Error(`Origin "${origin}" must use http or https`);
      }
    } catch (error) {
      throw new Error(
        `AUTH_INTEGRATIONS_JSON contains invalid allowed origin "${origin}": ${(error as Error).message}`,
      );
    }
  }
}

function resolveSecret(secretRef: string): string {
  const secret = process.env[secretRef];
  if (!secret) {
    throw new Error(`AUTH_INTEGRATIONS_JSON secretRef "${secretRef}" is missing`);
  }
  if (isPlaceholderSecret(secret)) {
    throw new Error(
      `AUTH_INTEGRATIONS_JSON secretRef "${secretRef}" is a placeholder value. ` +
        `Set a real secret before startup.`,
    );
  }
  if (secret.length < MIN_INTEGRATION_SECRET_LENGTH) {
    throw new Error(
      `AUTH_INTEGRATIONS_JSON secretRef "${secretRef}" is too short for integration token signing`,
    );
  }
  return secret;
}

function parseIntegrationConfigs(): Map<string, RegisteredIntegration> {
  let rawValue = env.AUTH_INTEGRATIONS_JSON;
  try {
    const parsedJson = JSON.parse(rawValue) as unknown;
    const parsed = integrationConfigSchema.safeParse(parsedJson);
    if (!parsed.success) {
      const issues = parsed.error.issues.map(
        (issue) => `${issue.path.join('.')}: ${issue.message}`,
      );
      throw new Error(`Invalid AUTH_INTEGRATIONS_JSON: ${issues.join('; ')}`);
    }

    const registry = new Map<string, RegisteredIntegration>();
    for (const config of parsed.data) {
      parseAllowedOrigins(config.allowedOrigins);
      const signingSecret = resolveSecret(config.secretRef);
      registry.set(config.id, { config, signingSecret });
    }
    return registry;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`AUTH_INTEGRATIONS_JSON must be valid JSON: ${error.message}`);
    }
    if (error instanceof Error) throw error;
    throw new Error('AUTH_INTEGRATIONS_JSON validation failed');
  }
}

let cache: Map<string, RegisteredIntegration> | null = null;

function getIntegrationRegistry(): Map<string, RegisteredIntegration> {
  if (!cache) {
    cache = parseIntegrationConfigs();
  }
  return cache;
}

export function getIntegrationById(integrationId: string) {
  return getIntegrationRegistry().get(integrationId)?.config ?? null;
}

export function getIntegrationSecretById(integrationId: string): string {
  const entry = getIntegrationRegistry().get(integrationId);
  if (!entry) {
    throw new Error(`Integration "${integrationId}" is not configured`);
  }
  return entry.signingSecret;
}

export function listIntegrationConfigs(): AuthIntegrationConfig[] {
  return Array.from(getIntegrationRegistry().values()).map((entry) => entry.config);
}

export function resetIntegrationRegistryForTests() {
  cache = null;
}

export function ensureIntegrationRegistry() {
  getIntegrationRegistry();
}
