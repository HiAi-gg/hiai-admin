import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';

interface MockChain {
  select: Mock;
  from: Mock;
  where: Mock;
  limit: Mock;
  offset: Mock;
  values: Mock;
  set: Mock;
  returning: Mock;
  insert: Mock;
  update: Mock;
  delete: Mock;
  innerJoin: Mock;
}

function createChain(terminal: unknown): MockChain {
  const chain = {} as MockChain;
  chain.select = vi.fn(() => chain);
  chain.from = vi.fn(() => chain);
  chain.innerJoin = vi.fn(() => chain);
  chain.where = vi.fn(() => chain);
  chain.limit = vi.fn(() => chain);
  chain.offset = vi.fn(() => chain);
  chain.values = vi.fn(() => chain);
  chain.set = vi.fn(() => chain);
  chain.returning = vi.fn(async () => terminal);
  chain.insert = vi.fn(() => chain);
  chain.update = vi.fn(() => chain);
  chain.delete = vi.fn(() => chain);
  // Drizzle query builders are thenable — `await db.select(...).from(...).where(...)`
  // resolves to the result array. Make the chain thenable too.
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

const { userService } = await import('../../src/modules/user/user.service.js');

const sampleUser = {
  id: 'user-1',
  email: 'alice@example.com',
  name: 'Alice',
  role: 'viewer',
  avatarUrl: null,
  twoFactorEnabled: false,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
};

describe('userService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('inserts user with provided id when given', async () => {
      const insertChain = createChain([sampleUser]);
      dbMock.insert.mockReturnValue(insertChain);

      await userService.create({ id: 'user-1', email: 'alice@example.com', name: 'Alice' });

      expect(dbMock.insert).toHaveBeenCalled();
      expect(insertChain.values).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'user-1',
          email: 'alice@example.com',
          name: 'Alice',
          role: 'viewer',
        }),
      );
    });

    it('defaults role to "viewer" when not provided', async () => {
      const insertChain = createChain([sampleUser]);
      dbMock.insert.mockReturnValue(insertChain);

      await userService.create({ email: 'alice@example.com', name: 'Bob' });

      expect(insertChain.values).toHaveBeenCalledWith(expect.objectContaining({ role: 'viewer' }));
    });

    it('honors a custom role when provided', async () => {
      const insertChain = createChain([{ ...sampleUser, role: 'super_admin' }]);
      dbMock.insert.mockReturnValue(insertChain);

      await userService.create({ email: 'alice@example.com', name: 'Admin', role: 'super_admin' });

      expect(insertChain.values).toHaveBeenCalledWith(
        expect.objectContaining({ role: 'super_admin' }),
      );
    });
  });

  describe('getById', () => {
    it('returns the user when found', async () => {
      const getChain = createChain([sampleUser]);
      dbMock.select.mockReturnValue(getChain);

      const result = await userService.getById('user-1');

      expect(result).toEqual(sampleUser);
      expect(getChain.where).toHaveBeenCalled();
    });

    it('returns undefined when not found', async () => {
      const getChain = createChain([]);
      dbMock.select.mockReturnValue(getChain);

      const result = await userService.getById('missing');
      expect(result).toBeUndefined();
    });
  });

  describe('list', () => {
    it('returns paginated items and metadata with defaults', async () => {
      const itemsChain = createChain([sampleUser]);
      const countChain = createChain([{ count: 1 }]);
      dbMock.select.mockReturnValueOnce(itemsChain).mockReturnValueOnce(countChain);

      const result = await userService.list();

      expect(result.items).toEqual([sampleUser]);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
        hasMore: false,
      });
    });

    it('applies search filter as a like query', async () => {
      const itemsChain = createChain([sampleUser]);
      const countChain = createChain([{ count: 1 }]);
      dbMock.select.mockReturnValueOnce(itemsChain).mockReturnValueOnce(countChain);

      await userService.list({ search: 'Alice' });

      expect(itemsChain.where).toHaveBeenCalled();
      expect(countChain.where).toHaveBeenCalled();
    });

    it('computes hasMore=true when more pages exist', async () => {
      const itemsChain = createChain([sampleUser, sampleUser, sampleUser]);
      const countChain = createChain([{ count: 30 }]);
      dbMock.select.mockReturnValueOnce(itemsChain).mockReturnValueOnce(countChain);

      const result = await userService.list({ page: 1, limit: 5 });
      expect(result.pagination.hasMore).toBe(true);
      expect(result.pagination.totalPages).toBe(6);
    });

    it('handles empty results with total=0', async () => {
      const itemsChain = createChain([]);
      const countChain = createChain([{ count: 0 }]);
      dbMock.select.mockReturnValueOnce(itemsChain).mockReturnValueOnce(countChain);

      const result = await userService.list({ page: 1, limit: 20 });
      expect(result.items).toEqual([]);
      expect(result.pagination.total).toBe(0);
      expect(result.pagination.totalPages).toBe(0);
      expect(result.pagination.hasMore).toBe(false);
    });

    it('handles missing count row gracefully', async () => {
      const itemsChain = createChain([]);
      const countChain = createChain([]);
      dbMock.select.mockReturnValueOnce(itemsChain).mockReturnValueOnce(countChain);

      const result = await userService.list();
      expect(result.pagination.total).toBe(0);
      expect(result.pagination.hasMore).toBe(false);
    });

    it('scopes results to user_tenant_access rows when tenantId is provided', async () => {
      const accessChain = createChain([{ userId: 'user-1' }, { userId: 'user-2' }]);
      const itemsChain = createChain([sampleUser]);
      const countChain = createChain([{ count: 1 }]);
      dbMock.select
        .mockReturnValueOnce(accessChain)
        .mockReturnValueOnce(itemsChain)
        .mockReturnValueOnce(countChain);

      const result = await userService.list({ tenantId: 'tenant-1' });

      expect(accessChain.from).toHaveBeenCalled();
      expect(accessChain.where).toHaveBeenCalled();
      expect(itemsChain.where).toHaveBeenCalled();
      expect(countChain.where).toHaveBeenCalled();
      expect(result.items).toEqual([sampleUser]);
      expect(result.pagination.total).toBe(1);
    });

    it('returns an empty page when no users have access to the given tenant', async () => {
      const accessChain = createChain([]);
      dbMock.select.mockReturnValueOnce(accessChain);

      const result = await userService.list({ tenantId: 'tenant-orphan' });

      expect(accessChain.from).toHaveBeenCalled();
      expect(accessChain.where).toHaveBeenCalled();
      expect(result.items).toEqual([]);
      expect(result.pagination.total).toBe(0);
      expect(result.pagination.totalPages).toBe(0);
      expect(result.pagination.hasMore).toBe(false);
    });
  });

  describe('update', () => {
    it('updates user fields and sets updatedAt', async () => {
      const updateChain = createChain([{ ...sampleUser, name: 'Updated' }]);
      dbMock.update.mockReturnValue(updateChain);

      await userService.update('user-1', { name: 'Updated' });

      expect(updateChain.set).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Updated', updatedAt: expect.any(Date) }),
      );
    });
  });

  describe('assignRole', () => {
    it('inserts a user-role assignment with current timestamp', async () => {
      const insertChain = createChain([{ userId: 'user-1', roleId: 'role-1', tenantId: null }]);
      dbMock.insert.mockReturnValue(insertChain);

      const result = await userService.assignRole('user-1', 'role-1');

      expect(insertChain.values).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          roleId: 'role-1',
          tenantId: null,
          grantedAt: expect.any(Date),
        }),
      );
      expect(result).toEqual({ userId: 'user-1', roleId: 'role-1', tenantId: null });
    });

    it('passes tenantId when provided', async () => {
      const insertChain = createChain([
        { userId: 'user-1', roleId: 'role-1', tenantId: 'tenant-1' },
      ]);
      dbMock.insert.mockReturnValue(insertChain);

      await userService.assignRole('user-1', 'role-1', 'tenant-1');

      expect(insertChain.values).toHaveBeenCalledWith(
        expect.objectContaining({ tenantId: 'tenant-1' }),
      );
    });
  });

  describe('revokeRole', () => {
    it('deletes the matching user-role assignment', async () => {
      const deleteChain = createChain(undefined);
      dbMock.delete.mockReturnValue(deleteChain);

      await userService.revokeRole('user-1', 'role-1');

      expect(dbMock.delete).toHaveBeenCalled();
      expect(deleteChain.where).toHaveBeenCalled();
    });

    it('adds tenantId condition when provided', async () => {
      const deleteChain = createChain(undefined);
      dbMock.delete.mockReturnValue(deleteChain);

      await userService.revokeRole('user-1', 'role-1', 'tenant-1');

      expect(deleteChain.where).toHaveBeenCalled();
    });
  });

  describe('2FA', () => {
    it('enables 2FA for a user', async () => {
      const updateChain = createChain([{ ...sampleUser, twoFactorEnabled: true }]);
      dbMock.update.mockReturnValue(updateChain);

      await userService.enable2FA('user-1');

      expect(updateChain.set).toHaveBeenCalledWith({ twoFactorEnabled: true });
    });

    it('disables 2FA for a user', async () => {
      const updateChain = createChain([{ ...sampleUser, twoFactorEnabled: false }]);
      dbMock.update.mockReturnValue(updateChain);

      await userService.disable2FA('user-1');

      expect(updateChain.set).toHaveBeenCalledWith({ twoFactorEnabled: false });
    });
  });

  describe('remove', () => {
    it('deletes a user and returns the deleted record', async () => {
      const deleteChain = createChain([sampleUser]);
      dbMock.delete.mockReturnValue(deleteChain);

      const result = await userService.remove('user-1');

      expect(dbMock.delete).toHaveBeenCalled();
      expect(result).toEqual(sampleUser);
    });
  });

  describe('getTenants', () => {
    it('returns the joined tenant list for a user', async () => {
      const row = {
        tenantId: 'tenant-1',
        slug: 'acme',
        name: 'Acme',
        status: 'active',
        plan: 'pro',
        role: 'editor',
        joinedAt: new Date('2026-01-01T00:00:00Z'),
      };
      const joinChain = createChain([row]);
      dbMock.select.mockReturnValue(joinChain);

      const result = await userService.getTenants('user-1');

      expect(joinChain.from).toHaveBeenCalled();
      expect(joinChain.innerJoin).toHaveBeenCalled();
      expect(joinChain.where).toHaveBeenCalled();
      expect(result).toEqual([row]);
    });

    it('returns an empty array when the user has no tenants', async () => {
      const joinChain = createChain([]);
      dbMock.select.mockReturnValue(joinChain);

      const result = await userService.getTenants('user-1');

      expect(result).toEqual([]);
    });
  });

  describe('joinTenant', () => {
    it('inserts a new access row when tenant exists and user is not a member', async () => {
      const tenantChain = createChain([{ id: 'tenant-1', slug: 'acme', name: 'Acme' }]);
      const existingChain = createChain([]);
      const insertChain = createChain([{ userId: 'user-1', tenantId: 'tenant-1' }]);
      dbMock.select.mockReturnValueOnce(tenantChain).mockReturnValueOnce(existingChain);
      dbMock.insert.mockReturnValue(insertChain);

      const result = await userService.joinTenant('user-1', 'acme');

      expect(result).toEqual({
        status: 'joined',
        tenantId: 'tenant-1',
        slug: 'acme',
        name: 'Acme',
      });
      expect(insertChain.values).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          tenantId: 'tenant-1',
          role: 'viewer',
        }),
      );
    });

    it('honors the explicit role when joining', async () => {
      const tenantChain = createChain([{ id: 'tenant-1', slug: 'acme', name: 'Acme' }]);
      const existingChain = createChain([]);
      const insertChain = createChain([{ userId: 'user-1', tenantId: 'tenant-1' }]);
      dbMock.select.mockReturnValueOnce(tenantChain).mockReturnValueOnce(existingChain);
      dbMock.insert.mockReturnValue(insertChain);

      await userService.joinTenant('user-1', 'acme', { role: 'editor' });

      expect(insertChain.values).toHaveBeenCalledWith(expect.objectContaining({ role: 'editor' }));
    });

    it('returns not_found when the tenant slug does not exist', async () => {
      const tenantChain = createChain([]);
      dbMock.select.mockReturnValueOnce(tenantChain);

      const result = await userService.joinTenant('user-1', 'ghost');

      expect(result).toEqual({ status: 'not_found' });
      expect(dbMock.insert).not.toHaveBeenCalled();
    });

    it('returns already_member when the user already has access', async () => {
      const tenantChain = createChain([{ id: 'tenant-1', slug: 'acme', name: 'Acme' }]);
      const existingChain = createChain([{ userId: 'user-1', tenantId: 'tenant-1' }]);
      dbMock.select.mockReturnValueOnce(tenantChain).mockReturnValueOnce(existingChain);

      const result = await userService.joinTenant('user-1', 'acme');

      expect(result).toEqual({ status: 'already_member', tenantId: 'tenant-1' });
      expect(dbMock.insert).not.toHaveBeenCalled();
    });
  });

  describe('leaveTenant', () => {
    it('deletes the user-tenant access row and returns true', async () => {
      const deleteChain = createChain([{ userId: 'user-1', tenantId: 'tenant-1' }]);
      dbMock.delete.mockReturnValue(deleteChain);

      const result = await userService.leaveTenant('user-1', 'tenant-1');

      expect(result).toBe(true);
      expect(deleteChain.where).toHaveBeenCalled();
    });

    it('returns false when no row was deleted', async () => {
      const deleteChain = createChain([]);
      dbMock.delete.mockReturnValue(deleteChain);

      const result = await userService.leaveTenant('user-1', 'tenant-x');

      expect(result).toBe(false);
    });
  });
});
