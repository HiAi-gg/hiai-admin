import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Elysia } from 'elysia';

vi.hoisted(() => {
  process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
  process.env.REDIS_URL = 'redis://localhost:6379';
  process.env.BETTER_AUTH_SECRET = 'test-shared-secret-min-32-characters-long-x';
  process.env.BETTER_AUTH_URL = 'http://localhost:50200';
});

// Capture every db.update(table).set(values) call for assertions.
type UpdateCall = { table: unknown; set: Record<string, unknown> };
const updateCalls: UpdateCall[] = [];
let selectResult: unknown[] = [];

function thenable<T>(terminal: T) {
  return {
    // biome-ignore lint/suspicious/noThenProperty: intentional thenable to mock Drizzle
    then: (onFulfilled?: (v: T) => unknown, onRejected?: (e: unknown) => unknown) =>
      Promise.resolve(terminal).then(onFulfilled, onRejected),
  };
}

const dbMock = {
  update: vi.fn((table: unknown) => {
    const chain: Record<string, unknown> = { ...thenable(undefined) };
    chain.set = vi.fn((values: Record<string, unknown>) => {
      updateCalls.push({ table, set: values });
      return chain;
    });
    chain.where = vi.fn(() => chain);
    return chain;
  }),
  select: vi.fn(() => {
    const chain: Record<string, unknown> = { ...thenable(selectResult) };
    chain.from = vi.fn(() => chain);
    chain.where = vi.fn(() => chain);
    return chain;
  }),
};

const constructWebhookEvent = vi.fn();

vi.mock('../../src/lib/db.js', () => ({
  db: dbMock,
  dbHealthCheck: vi.fn(),
  withTransaction: vi.fn(),
}));
vi.mock('../../src/lib/logger.js', () => {
  const noop = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() };
  return {
    logger: { ...noop, child: () => noop },
    createChildLogger: () => noop,
  };
});
vi.mock('../../src/modules/billing/stripe.service.js', () => ({
  stripeService: { constructWebhookEvent },
}));
// Rate limiter needs Redis — replace with a no-op Elysia plugin.
vi.mock('../../src/api/middleware/rateLimiter.js', () => ({
  createRateLimiter: () => new Elysia(),
}));

const { webhooksStripeRoutes } = await import('../../src/api/routes/webhooks-stripe.js');
const { invoices, subscriptions, tenants } = await import('../../src/db/schema/index.js');

function post(body: unknown, headers: Record<string, string> = { 'stripe-signature': 'sig_test' }) {
  return webhooksStripeRoutes.handle(
    new Request('http://localhost/api/webhooks/stripe', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    }),
  );
}

describe('POST /api/webhooks/stripe', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    updateCalls.length = 0;
    selectResult = [];
  });

  it('rejects requests without a stripe-signature header (400)', async () => {
    const res = await post({}, {});
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Missing stripe-signature header' });
    expect(constructWebhookEvent).not.toHaveBeenCalled();
  });

  it('rejects an event whose signature fails verification (400)', async () => {
    constructWebhookEvent.mockRejectedValueOnce(new Error('Invalid signature'));
    const res = await post({ raw: 'payload' });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Invalid signature' });
  });

  it('invoice.paid → marks the invoice paid', async () => {
    constructWebhookEvent.mockResolvedValueOnce({
      type: 'invoice.paid',
      data: { object: { id: 'in_123' } },
    });

    const res = await post({});
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ received: true });
    expect(updateCalls).toHaveLength(1);
    expect(updateCalls[0].table).toBe(invoices);
    expect(updateCalls[0].set).toEqual({ status: 'paid' });
  });

  it('invoice.payment_failed → moves the invoice to past_due', async () => {
    constructWebhookEvent.mockResolvedValueOnce({
      type: 'invoice.payment_failed',
      data: { object: { id: 'in_456' } },
    });

    const res = await post({});
    expect(res.status).toBe(200);
    expect(updateCalls[0].table).toBe(invoices);
    expect(updateCalls[0].set).toEqual({ status: 'past_due' });
  });

  it('customer.subscription.updated → syncs status, plan and period dates', async () => {
    constructWebhookEvent.mockResolvedValueOnce({
      type: 'customer.subscription.updated',
      data: {
        object: {
          id: 'sub_1',
          status: 'active',
          metadata: { plan: 'pro' },
          cancel_at_period_end: false,
          current_period_start: 1_700_000_000,
          current_period_end: 1_702_592_000,
        },
      },
    });

    const res = await post({});
    expect(res.status).toBe(200);
    expect(updateCalls[0].table).toBe(subscriptions);
    expect(updateCalls[0].set).toMatchObject({
      status: 'active',
      plan: 'pro',
      cancelAtPeriodEnd: false,
    });
    expect(updateCalls[0].set.currentPeriodStart).toEqual(new Date(1_700_000_000 * 1000));
    expect(updateCalls[0].set.currentPeriodEnd).toEqual(new Date(1_702_592_000 * 1000));
  });

  it('customer.subscription.deleted → cancels the subscription and suspends its tenant', async () => {
    selectResult = [{ id: 'sub_row', tenantId: 'tenant-1' }];
    constructWebhookEvent.mockResolvedValueOnce({
      type: 'customer.subscription.deleted',
      data: { object: { id: 'sub_1' } },
    });

    const res = await post({});
    expect(res.status).toBe(200);
    // 1) subscription → canceled, 2) tenant → suspended
    expect(updateCalls).toHaveLength(2);
    expect(updateCalls[0].table).toBe(subscriptions);
    expect(updateCalls[0].set).toMatchObject({ status: 'canceled' });
    expect(updateCalls[1].table).toBe(tenants);
    expect(updateCalls[1].set).toMatchObject({ status: 'suspended' });
  });

  it('does not suspend any tenant when the deleted subscription is unknown', async () => {
    selectResult = []; // no matching subscription row
    constructWebhookEvent.mockResolvedValueOnce({
      type: 'customer.subscription.deleted',
      data: { object: { id: 'sub_unknown' } },
    });

    const res = await post({});
    expect(res.status).toBe(200);
    expect(updateCalls).toHaveLength(1); // only the subscription update, no tenant suspend
    expect(updateCalls[0].table).toBe(subscriptions);
  });

  it('acknowledges unhandled event types without touching the database', async () => {
    constructWebhookEvent.mockResolvedValueOnce({
      type: 'customer.created',
      data: { object: { id: 'cus_1' } },
    });

    const res = await post({});
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ received: true });
    expect(updateCalls).toHaveLength(0);
  });
});
