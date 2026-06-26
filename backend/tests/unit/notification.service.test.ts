import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';

interface MockChain {
  select: Mock;
  from: Mock;
  where: Mock;
  limit: Mock;
  offset: Mock;
  orderBy: Mock;
  values: Mock;
  set: Mock;
  returning: Mock;
  insert: Mock;
  update: Mock;
  delete: Mock;
}

function createChain(terminal: unknown): MockChain {
  const chain = {} as MockChain;
  chain.select = vi.fn(() => chain);
  chain.from = vi.fn(() => chain);
  chain.where = vi.fn(() => chain);
  chain.limit = vi.fn(() => chain);
  chain.offset = vi.fn(() => chain);
  chain.orderBy = vi.fn(() => chain);
  chain.values = vi.fn(() => chain);
  chain.set = vi.fn(() => chain);
  chain.returning = vi.fn(async () => terminal);
  chain.insert = vi.fn(() => chain);
  chain.update = vi.fn(() => chain);
  chain.delete = vi.fn(() => chain);
  // biome-ignore lint/suspicious/noThenProperty: intentional thenable to mock Drizzle
  (chain as unknown as { then: unknown }).then = (
    onFulfilled?: (v: unknown) => unknown,
    onRejected?: (e: unknown) => unknown,
  ) => Promise.resolve(terminal).then(onFulfilled, onRejected);
  return chain;
}

const dbMock = {
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
};

// Mock the Novu lib BEFORE importing the service. The lib module reads
// env.NOVU_API_KEY at construction time, so we just stub the methods.
vi.mock('../../src/lib/novu.js', () => ({
  novu: {
    enabled: false,
    upsertSubscriber: vi.fn(async () => ({ ok: false, reason: 'novu_disabled' })),
    trigger: vi.fn(async () => ({ delivered: false, reason: 'novu_disabled' })),
    markAsRead: vi.fn(async () => ({ ok: false, reason: 'novu_disabled' })),
  },
}));

vi.mock('../../src/lib/db.js', () => ({
  db: dbMock,
}));

vi.mock('../../src/lib/logger.js', () => {
  const childLogger = () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: childLogger,
  });
  return {
    logger: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      child: childLogger,
    },
    createChildLogger: () => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    }),
  };
});

vi.mock('../../src/lib/config.js', () => ({
  env: {
    DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
    REDIS_URL: 'redis://localhost:6379',
    BETTER_AUTH_SECRET: 'test-shared-secret-min-32-characters-long-x',
    BETTER_AUTH_URL: 'http://localhost:50200',
  },
}));

const { notificationService } = await import(
  '../../src/modules/notifications/notification.service.js'
);
const { novu } = await import('../../src/lib/novu.js');

const sampleRow = {
  id: '11111111-1111-1111-1111-111111111111',
  userId: 'user-1',
  type: 'tenant_created',
  title: 'Welcome',
  body: 'Hello',
  data: { foo: 'bar' },
  novuMessageId: null,
  read: false,
  readAt: null,
  createdAt: new Date('2026-01-01T00:00:00Z'),
};

beforeEach(() => {
  vi.resetAllMocks();
});

describe('notificationService', () => {
  describe('send', () => {
    it('inserts a row and returns the DTO', async () => {
      const insertChain = createChain([sampleRow]);
      dbMock.insert.mockReturnValue(insertChain);

      const result = await notificationService.send({
        userId: 'user-1',
        type: 'tenant_created',
        title: 'Welcome',
        body: 'Hello',
        data: { foo: 'bar' },
      });

      expect(dbMock.insert).toHaveBeenCalled();
      expect(result.id).toBe(sampleRow.id);
      expect(result.read).toBe(false);
      expect(result.data).toEqual({ foo: 'bar' });
    });

    it('upserts subscriber and triggers Novu when subscriber info is provided', async () => {
      const insertChain = createChain([{ ...sampleRow, novuMessageId: 'novu-1' }]);
      dbMock.insert.mockReturnValue(insertChain);
      vi.mocked(novu.enabled, true);
      // override per-test
      (novu as { enabled: boolean }).enabled = true;
      vi.mocked(novu.upsertSubscriber).mockResolvedValueOnce({ ok: true });
      vi.mocked(novu.trigger).mockResolvedValueOnce({
        delivered: true,
        messageId: 'novu-1',
      });

      await notificationService.send({
        userId: 'user-1',
        type: 'tenant_created',
        title: 'Welcome',
        subscriber: { email: 'a@example.com', firstName: 'A' },
      });

      expect(novu.upsertSubscriber).toHaveBeenCalledWith(
        expect.objectContaining({ subscriberId: 'user-1', email: 'a@example.com' }),
      );
      expect(novu.trigger).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'tenant_created', to: { subscriberId: 'user-1' } }),
      );

      // restore
      (novu as { enabled: boolean }).enabled = false;
    });
  });

  describe('list', () => {
    it('returns paginated items with unread count', async () => {
      const dataChain = createChain([sampleRow]);
      const totalChain = createChain([{ count: 1 }]);
      const unreadChain = createChain([{ count: 1 }]);
      dbMock.select
        .mockReturnValueOnce(dataChain)
        .mockReturnValueOnce(totalChain)
        .mockReturnValueOnce(unreadChain);

      const result = await notificationService.list({ userId: 'user-1' });

      expect(result.items).toHaveLength(1);
      expect(result.pagination).toMatchObject({
        total: 1,
        pages: 1,
        unreadCount: 1,
      });
    });
  });

  describe('markAsRead', () => {
    it('returns null when notification does not exist', async () => {
      dbMock.select.mockReturnValueOnce(createChain([]));
      const result = await notificationService.markAsRead('nope', 'user-1');
      expect(result).toBeNull();
    });

    it('updates read=true and readAt when notification exists', async () => {
      dbMock.select.mockReturnValueOnce(createChain([sampleRow]));
      const updateChain = createChain([{ ...sampleRow, read: true, readAt: new Date() }]);
      dbMock.update.mockReturnValue(updateChain);

      const result = await notificationService.markAsRead(sampleRow.id, 'user-1');

      expect(updateChain.set).toHaveBeenCalledWith(
        expect.objectContaining({ read: true, readAt: expect.any(Date) }),
      );
      expect(result?.read).toBe(true);
    });
  });

  describe('markAllAsRead', () => {
    it('returns the number of rows updated', async () => {
      const updateChain = createChain([{ id: 'a' }, { id: 'b' }]);
      dbMock.update.mockReturnValue(updateChain);

      const result = await notificationService.markAllAsRead('user-1');

      expect(updateChain.set).toHaveBeenCalledWith(
        expect.objectContaining({ read: true, readAt: expect.any(Date) }),
      );
      expect(result.updated).toBe(2);
    });
  });

  describe('createSubscriber', () => {
    it('returns novu_disabled when Novu is disabled', async () => {
      (novu as { enabled: boolean }).enabled = false;
      const result = await notificationService.createSubscriber('user-1', 'a@example.com');
      expect(result.reason).toBe('novu_disabled');
    });
  });
});
