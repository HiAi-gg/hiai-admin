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
  // Drizzle query builders are thenable — `await db.select(...).from(...).where(...)`
  // resolves to the result array. Make the chain thenable too so destructuring
  // patterns like `const [row] = await chain` work in service code.
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

vi.mock('../../src/lib/db.js', () => ({
  db: dbMock,
  dbHealthCheck: vi.fn(),
  withTransaction: vi.fn(),
}));
vi.mock('../../src/lib/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
  createChildLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
}));
vi.mock('../../src/lib/config.js', () => ({
  env: {
    DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
    REDIS_URL: 'redis://localhost:6379',
    BETTER_AUTH_SECRET: 'test-shared-secret-min-32-characters-long-x',
    BETTER_AUTH_URL: 'http://localhost:50200',
  },
}));

const { tenantService } = await import('../../src/modules/tenant/tenant.service.js');

const sampleTenant = {
  id: 'tenant-1',
  name: 'Acme Store',
  slug: 'acme',
  email: 'alice@example.com',
  plan: 'pro',
  status: 'active',
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
};

// resetAllMocks (not clearAllMocks) so the mockReturnValueOnce queue is also cleared.
beforeEach(() => {
  vi.resetAllMocks();
});

describe('tenantService', () => {
  describe('list', () => {
    it('returns paginated data and pagination metadata', async () => {
      const dataChain = createChain([sampleTenant]);
      const countChain = createChain([{ count: 1 }]);
      // First select call = count, second = data (per service code order)
      dbMock.select.mockReturnValueOnce(countChain).mockReturnValueOnce(dataChain);

      const result = await tenantService.list({ page: 1, limit: 20 });

      expect(result.data).toEqual([sampleTenant]);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 1,
        pages: 1,
        hasMore: false,
      });
    });

    it('applies status filter to the query', async () => {
      const dataChain = createChain([sampleTenant]);
      const countChain = createChain([{ count: 1 }]);
      dbMock.select.mockReturnValueOnce(countChain).mockReturnValueOnce(dataChain);

      await tenantService.list({ status: 'active' });

      expect(dataChain.where).toHaveBeenCalled();
    });

    it('applies search filter (ilike) to the query', async () => {
      const dataChain = createChain([sampleTenant]);
      const countChain = createChain([{ count: 1 }]);
      dbMock.select.mockReturnValueOnce(countChain).mockReturnValueOnce(dataChain);

      await tenantService.list({ search: 'acme' });

      expect(dataChain.where).toHaveBeenCalled();
    });

    it('computes hasMore=true when there are more pages', async () => {
      const dataChain = createChain([sampleTenant, sampleTenant, sampleTenant]);
      const countChain = createChain([{ count: 30 }]);
      dbMock.select.mockReturnValueOnce(countChain).mockReturnValueOnce(dataChain);

      const result = await tenantService.list({ page: 1, limit: 5 });
      expect(result.pagination.hasMore).toBe(true);
      expect(result.pagination.pages).toBe(6);
    });

    it('uses default page=1 and limit=20 when not provided', async () => {
      const dataChain = createChain([sampleTenant]);
      const countChain = createChain([{ count: 1 }]);
      dbMock.select.mockReturnValueOnce(countChain).mockReturnValueOnce(dataChain);

      await tenantService.list({});
      expect(dataChain.limit).toHaveBeenCalledWith(20);
      expect(dataChain.offset).toHaveBeenCalledWith(0);
    });

    it('computes correct offset for page 3 with limit 10', async () => {
      const dataChain = createChain([sampleTenant]);
      const countChain = createChain([{ count: 1 }]);
      dbMock.select.mockReturnValueOnce(countChain).mockReturnValueOnce(dataChain);

      await tenantService.list({ page: 3, limit: 10 });
      expect(dataChain.limit).toHaveBeenCalledWith(10);
      expect(dataChain.offset).toHaveBeenCalledWith(20);
    });
  });

  describe('getById', () => {
    it('returns tenant with users and subscription', async () => {
      const tenantChain = createChain([sampleTenant]);
      const usersChain = createChain([]);
      const subChain = createChain([{ id: 'sub-1', tenantId: 'tenant-1', plan: 'pro' }]);
      dbMock.select
        .mockReturnValueOnce(tenantChain)
        .mockReturnValueOnce(usersChain)
        .mockReturnValueOnce(subChain);

      const result = await tenantService.getById('tenant-1');
      expect(result.id).toBe('tenant-1');
      expect(result.users).toEqual([]);
      expect(result.subscription).toEqual({
        id: 'sub-1',
        tenantId: 'tenant-1',
        plan: 'pro',
      });
    });

    it('throws "Tenant not found" when no tenant is returned', async () => {
      dbMock.select
        .mockReturnValueOnce(createChain([]))
        .mockReturnValueOnce(createChain([]))
        .mockReturnValueOnce(createChain([]));

      await expect(tenantService.getById('missing')).rejects.toThrow('Tenant not found');
    });
  });

  describe('create', () => {
    it('inserts a tenant and returns it', async () => {
      const inserted = { ...sampleTenant, name: 'New', slug: 'new' };
      const insertChain = createChain([inserted]);
      dbMock.insert.mockReturnValue(insertChain);

      const result = await tenantService.create({
        name: 'New',
        slug: 'new',
        email: 'alice@example.com',
        plan: 'free',
      });

      expect(dbMock.insert).toHaveBeenCalled();
      expect(result).toEqual(inserted);
    });
  });

  describe('update', () => {
    it('updates a tenant and sets updatedAt', async () => {
      const updated = { ...sampleTenant, name: 'Updated' };
      const updateChain = createChain([updated]);
      dbMock.update.mockReturnValue(updateChain);

      const result = await tenantService.update('tenant-1', { name: 'Updated' });

      expect(dbMock.update).toHaveBeenCalled();
      expect(updateChain.set).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Updated', updatedAt: expect.any(Date) }),
      );
      expect(result.name).toBe('Updated');
    });
  });

  describe('suspend', () => {
    it('sets status to "suspended"', async () => {
      const updateChain = createChain([{ ...sampleTenant, status: 'suspended' }]);
      dbMock.update.mockReturnValue(updateChain);

      await tenantService.suspend('tenant-1', 'payment overdue');

      expect(updateChain.set).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'suspended', updatedAt: expect.any(Date) }),
      );
    });
  });

  describe('reactivate', () => {
    it('sets status to "active"', async () => {
      const updateChain = createChain([{ ...sampleTenant, status: 'active' }]);
      dbMock.update.mockReturnValue(updateChain);

      await tenantService.reactivate('tenant-1');

      expect(updateChain.set).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'active', updatedAt: expect.any(Date) }),
      );
    });
  });

  describe('changePlan', () => {
    it('updates the plan field and timestamp', async () => {
      const updateChain = createChain([{ ...sampleTenant, plan: 'enterprise' }]);
      dbMock.update.mockReturnValue(updateChain);

      await tenantService.changePlan('tenant-1', 'enterprise');

      expect(updateChain.set).toHaveBeenCalledWith(
        expect.objectContaining({ plan: 'enterprise', updatedAt: expect.any(Date) }),
      );
    });
  });

  describe('softDelete', () => {
    it('sets status to "deleted"', async () => {
      const updateChain = createChain([{ ...sampleTenant, status: 'deleted' }]);
      dbMock.update.mockReturnValue(updateChain);

      await tenantService.softDelete('tenant-1');

      expect(updateChain.set).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'deleted', updatedAt: expect.any(Date) }),
      );
    });
  });
});
