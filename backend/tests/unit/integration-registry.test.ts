import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
  process.env.REDIS_URL = 'redis://localhost:6379';
  process.env.BETTER_AUTH_SECRET = 'test-shared-secret-min-32-characters-long-x';
  process.env.BETTER_AUTH_URL = 'http://localhost:50200';
});

import { _resetEnvForTests } from '../../src/lib/config.js';
import {
  getIntegrationById,
  getIntegrationSecretById,
  listIntegrationConfigs,
  resetIntegrationRegistryForTests,
} from '../../src/modules/integrations/integration-registry.js';

function configureRegistryEnv(overrides?: {
  json?: string;
  secrets?: Record<string, string | undefined>;
}) {
  _resetEnvForTests();
  resetIntegrationRegistryForTests();

  const json =
    overrides?.json ??
    JSON.stringify([
      {
        id: 'integration-a',
        audience: 'integration-a-aud',
        issuer: 'integration-a-iss',
        secretRef: 'INTEGRATION_A_SECRET',
        allowedOrigins: ['https://console.hiai.local'],
      },
    ]);
  process.env.AUTH_INTEGRATIONS_JSON = json;

  for (const [name, value] of Object.entries(overrides?.secrets ?? {})) {
    if (value === undefined) {
      delete process.env[name];
    } else {
      process.env[name] = value;
    }
  }
  process.env.INTEGRATION_A_SECRET ??= 'integration-a-secret-that-is-long-enough-32-chars';
  process.env.INTEGRATION_B_SECRET ??= 'integration-b-secret-that-is-long-enough-32-chars';
}

describe('integration-registry', () => {
  beforeEach(() => {
    configureRegistryEnv();
  });

  it('parses valid integration configs and resolves by id', () => {
    const primary = getIntegrationById('integration-a');
    expect(primary).toMatchObject({
      id: 'integration-a',
      audience: 'integration-a-aud',
      issuer: 'integration-a-iss',
      secretRef: 'INTEGRATION_A_SECRET',
    });

    expect(listIntegrationConfigs()).toHaveLength(1);
    expect(getIntegrationSecretById('integration-a')).toBe(
      'integration-a-secret-that-is-long-enough-32-chars',
    );
  });

  it('rejects duplicate integration ids', () => {
    configureRegistryEnv({
      json: JSON.stringify([
        {
          id: 'duplicate',
          audience: 'aud-1',
          issuer: 'iss-1',
          secretRef: 'INTEGRATION_A_SECRET',
          allowedOrigins: ['https://first.hiai.local'],
        },
        {
          id: 'duplicate',
          audience: 'aud-2',
          issuer: 'iss-2',
          secretRef: 'INTEGRATION_B_SECRET',
          allowedOrigins: ['https://second.hiai.local'],
        },
      ]),
    });

    expect(() => listIntegrationConfigs()).toThrowError(/Duplicate integration id "duplicate"/);
  });

  it('rejects placeholder secret references', () => {
    configureRegistryEnv({
      json: JSON.stringify([
        {
          id: 'placeholder',
          audience: 'aud-placeholder',
          issuer: 'iss-placeholder',
          secretRef: 'PLACEHOLDER_SECRET',
          allowedOrigins: ['https://placeholder.local'],
        },
      ]),
      secrets: { PLACEHOLDER_SECRET: 'change-me' },
    });

    expect(() => listIntegrationConfigs()).toThrowError(/placeholder/);
  });

  it('rejects missing secret references', () => {
    configureRegistryEnv({
      json: JSON.stringify([
        {
          id: 'missing-secret',
          audience: 'aud-missing',
          issuer: 'iss-missing',
          secretRef: 'MISSING_SECRET',
          allowedOrigins: ['https://missing.local'],
        },
      ]),
      secrets: { MISSING_SECRET: undefined },
    });

    expect(() => listIntegrationConfigs()).toThrowError(/missing/);
  });

  it('rejects short signing secrets', () => {
    configureRegistryEnv({
      json: JSON.stringify([
        {
          id: 'short-secret',
          audience: 'aud-short',
          issuer: 'iss-short',
          secretRef: 'INTEGRATION_A_SECRET',
          allowedOrigins: ['https://short.local'],
        },
      ]),
      secrets: { INTEGRATION_A_SECRET: 'short' },
    });

    expect(() => listIntegrationConfigs()).toThrowError(/too short/);
  });
});
