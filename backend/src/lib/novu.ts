import { env } from './config.js';
import { logger } from './logger.js';

/**
 * Novu SDK initialization with graceful fallback.
 *
 * If NOVU_API_KEY is not set, every operation is a no-op (returns the shape
 * the service callers expect without throwing). This lets the rest of the
 * codebase call `sendNotification` unconditionally — the integrations page
 * will show "disconnected" until a real key is provisioned.
 *
 * Novu's HTTP API is called directly via fetch instead of pulling in the
 * `novu` npm package — the package is heavy and the API surface we need
 * (subscribers + trigger events + mark-as-read) is just three endpoints.
 * See https://docs.novu.co/api-reference/.
 */

export interface NovuSubscriber {
  subscriberId: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  data?: Record<string, unknown>;
}

export interface NovuTriggerPayload {
  name: string;
  to: { subscriberId: string };
  payload?: Record<string, unknown>;
}

export interface NovuSendResult {
  /** True if Novu accepted the trigger (or no-op when key missing). */
  delivered: boolean;
  /** Novu transaction id (when delivered). Used by clients to mark-as-read. */
  messageId?: string;
  /** Reason delivery was skipped (no key, network error, etc.). */
  reason?: string;
}

export interface NovuClient {
  enabled: boolean;
  upsertSubscriber(subscriber: NovuSubscriber): Promise<{ ok: boolean; reason?: string }>;
  trigger(payload: NovuTriggerPayload): Promise<NovuSendResult>;
  markAsRead(subscriberId: string, messageId: string): Promise<{ ok: boolean; reason?: string }>;
}

const log = logger.child({ module: 'novu' });

function buildClient(): NovuClient {
  const apiKey = env.NOVU_API_KEY;
  const baseUrl = (env.NOVU_API_URL ?? 'https://api.novu.co').replace(/\/$/, '');

  if (!apiKey) {
    log.warn(
      'NOVU_API_KEY not set — notifications will be no-op. Set NOVU_API_KEY to enable delivery.',
    );
    return {
      enabled: false,
      async upsertSubscriber() {
        return { ok: false, reason: 'novu_disabled' };
      },
      async trigger() {
        return { delivered: false, reason: 'novu_disabled' };
      },
      async markAsRead() {
        return { ok: false, reason: 'novu_disabled' };
      },
    };
  }

  async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        Authorization: `ApiKey ${apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Novu ${method} ${path} failed: ${res.status} ${text.slice(0, 200)}`);
    }
    return res.json() as Promise<T>;
  }

  return {
    enabled: true,
    async upsertSubscriber(subscriber) {
      try {
        // Upsert semantics: PUT /v2/subscribers creates-or-updates by subscriberId.
        await call('PUT', `/v2/subscribers/${encodeURIComponent(subscriber.subscriberId)}`, {
          subscriberId: subscriber.subscriberId,
          email: subscriber.email,
          firstName: subscriber.firstName,
          lastName: subscriber.lastName,
          data: subscriber.data,
        });
        return { ok: true };
      } catch (err) {
        log.warn({ err: String(err), subscriberId: subscriber.subscriberId }, 'Novu upsert failed');
        return { ok: false, reason: 'novu_error' };
      }
    },
    async trigger(payload) {
      try {
        // POST /v1/events/trigger — returns { data: { transactionId, ... } } on success.
        const res = await call<{ data?: { transactionId?: string } }>(
          'POST',
          '/v1/events/trigger',
          payload,
        );
        return {
          delivered: true,
          messageId: res.data?.transactionId,
        };
      } catch (err) {
        log.warn(
          { err: String(err), event: payload.name, to: payload.to.subscriberId },
          'Novu trigger failed',
        );
        return { delivered: false, reason: 'novu_error' };
      }
    },
    async markAsRead(subscriberId, messageId) {
      try {
        // PATCH /v1/messages/mark-as — marks a single message as read by
        // { messageId, subscriberId }. Use the transactional id we get back
        // from trigger() above.
        await call('PATCH', '/v1/messages/mark-as', {
          messageId,
          subscriberId,
          mark: { read: true, seen: true },
        });
        return { ok: true };
      } catch (err) {
        log.warn({ err: String(err), subscriberId, messageId }, 'Novu markAsRead failed');
        return { ok: false, reason: 'novu_error' };
      }
    },
  };
}

export const novu: NovuClient = buildClient();
