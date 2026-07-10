import { createHmac, randomUUID } from 'node:crypto';
import { env } from '../../lib/config.js';
import { createChildLogger } from '../../lib/logger.js';
import type { AuthActionEvent } from './auth-event.types.js';

const log = createChildLogger('auth-events');

const placeholderPattern = /(^|[:\s])(change[-_]?me|your[-_]?secret|placeholder|example|dummy)/i;
const RETRY_DELAYS_MS = [250, 1_000, 3_000];
const DEFAULT_WEBHOOK_TIMEOUT_MS = 10_000;

export interface AuthActionEventPayload {
  type: AuthActionEvent['type'];
  email: string;
  name?: string;
  actionUrl: string;
  locale?: string;
  id?: string;
}

export interface AuthEventDeliveryResult {
  eventId: string;
  attempts: number;
}

export interface AuthEventDependencies {
  webhookUrl?: string;
  webhookSecret?: string;
  webhookAudience?: string;
  webhookIssuer?: string;
  maxRetries?: number;
  webhookTimeoutMs?: number;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
  doFetch?: (url: string, init: RequestInit) => Promise<Response>;
}

function toBase64Url(input: string): string {
  return Buffer.from(input).toString('base64url');
}

export function isPlaceholderSecret(value: string): boolean {
  return placeholderPattern.test(value);
}

function signToken(
  payload: Record<string, unknown>,
  secret: string,
): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = toBase64Url(JSON.stringify(header));
  const encodedBody = toBase64Url(JSON.stringify(payload));
  const signature = createHmac('sha256', secret)
    .update(`${encodedHeader}.${encodedBody}`)
    .digest()
    .toString('base64url');
  return `${encodedHeader}.${encodedBody}.${signature}`;
}

function buildClaims(
  event: AuthActionEvent,
  nowEpochSec: number,
  claims: { aud: string; iss: string },
) {
  return {
    iss: claims.iss,
    aud: claims.aud,
    sub: 'auth-event',
    eventId: event.id,
    eventType: event.type,
    iat: nowEpochSec,
    exp: nowEpochSec + 60,
  };
}

export function createAuthEventPayload(event: AuthActionEventPayload): AuthActionEvent {
  const now = new Date();
  return {
    id: event.id || randomUUID(),
    type: event.type,
    recipient: {
      email: event.email.toLowerCase(),
      ...(event.name ? { name: event.name } : {}),
    },
    actionUrl: event.actionUrl,
    locale: event.locale,
    expiresAt: new Date(now.getTime() + 60_000).toISOString(),
  };
}

export function createAuthEventService(deps: AuthEventDependencies = {}) {
  const webhookUrl = deps.webhookUrl ?? env.AUTH_EVENT_WEBHOOK_URL;
  const webhookSecret = deps.webhookSecret ?? env.AUTH_EVENT_WEBHOOK_SECRET;
  const webhookAudience = deps.webhookAudience ?? env.AUTH_EVENT_WEBHOOK_AUDIENCE;
  const webhookIssuer = deps.webhookIssuer ?? env.AUTH_EVENT_WEBHOOK_ISSUER;
  const maxRetries = deps.maxRetries ?? 3;
  const webhookTimeoutMs = deps.webhookTimeoutMs ?? DEFAULT_WEBHOOK_TIMEOUT_MS;
  const now = deps.now ?? (() => Math.floor(Date.now() / 1000));
  const sleep = deps.sleep ?? ((ms: number) => new Promise((resolve) => setTimeout(resolve, ms)));
  const doFetch = deps.doFetch ?? ((url: string, init: RequestInit) => fetch(url, init));

  if (webhookSecret && isPlaceholderSecret(webhookSecret)) {
    throw new Error(
      'AUTH_EVENT_WEBHOOK_SECRET is rejected as a placeholder value. Set a real secret before startup.',
    );
  }

  async function postEvent(payload: AuthActionEvent): Promise<AuthEventDeliveryResult> {
    if (!webhookUrl || !webhookSecret) {
      log.warn(
        {
          eventId: payload.id,
          eventType: payload.type,
        },
        'Auth event webhook not configured. Skipping notification delivery.',
      );
      return { eventId: payload.id, attempts: 0 };
    }

    const claims = buildClaims(payload, now(), {
      aud: webhookAudience,
      iss: webhookIssuer,
    });
    const token = signToken({ ...claims, jti: payload.id }, webhookSecret);
    const body = JSON.stringify({ event: payload, token });

    let lastStatus: number | undefined;
    let lastError: unknown;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      if (attempt > 0) {
        const delay = RETRY_DELAYS_MS[attempt - 1];
        if (delay) await sleep(delay);
      }

      const controller = new AbortController();
      const timer = setTimeout(() => {
        controller.abort();
      }, webhookTimeoutMs);

      try {
        const response = await doFetch(webhookUrl, {
          method: 'POST',
          signal: controller.signal,
          headers: {
            'content-type': 'application/json',
            accept: 'application/json',
            'idempotency-key': payload.id,
            authorization: `Bearer ${token}`,
          },
          body,
        });

        if (response.status >= 200 && response.status < 300) {
          log.debug(
            {
              eventId: payload.id,
              eventType: payload.type,
              status: response.status,
            },
            'Auth event webhook delivered',
          );
          return { eventId: payload.id, attempts: attempt + 1 };
        }

        lastStatus = response.status;

        if (response.status >= 400 && response.status < 500) {
          const bodyText = await response.text().catch(() => '');
          const message = `Auth event webhook rejected with ${response.status} ${response.statusText}`;
          log.warn(
            {
              eventId: payload.id,
              eventType: payload.type,
              status: response.status,
            },
            message,
          );
          throw new Error(`${message} ${bodyText.slice(0, 140)}`);
        }

        lastError = new Error(
          `Auth event webhook failed with status ${response.status} ${response.statusText}`,
        );
      } catch (err) {
        if ((err as DOMException | undefined)?.name === 'AbortError') {
          lastError = new Error(`Auth event webhook request timed out after ${webhookTimeoutMs}ms`);
        } else {
          lastError = err;
        }
      } finally {
        clearTimeout(timer);
      }

      if (lastStatus && lastStatus >= 400 && lastStatus < 500) {
        break;
      }

      if (attempt >= maxRetries) {
        break;
      }
    }

    log.warn(
      {
        eventId: payload.id,
        eventType: payload.type,
      },
      'Auth event webhook failed after retry budget',
    );
    throw lastError ?? new Error('Auth event webhook failed');
  }

  async function sendEmailVerificationRequested(input: AuthActionEventPayload): Promise<AuthEventDeliveryResult> {
    const payload = createAuthEventPayload({
      ...input,
      type: 'auth.email_verification_requested',
    });
    return postEvent(payload);
  }

  async function sendPasswordResetRequested(input: AuthActionEventPayload): Promise<AuthEventDeliveryResult> {
    const payload = createAuthEventPayload({
      ...input,
      type: 'auth.password_reset_requested',
    });
    return postEvent(payload);
  }

  return {
    createAuthEventPayload,
    sendEmailVerificationRequested,
    sendPasswordResetRequested,
  };
}

export const authEventService = createAuthEventService();
