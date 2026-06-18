import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';

interface MockChain {
  select: Mock;
  from: Mock;
  where: Mock;
  limit: Mock;
  values: Mock;
  set: Mock;
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
  chain.values = vi.fn(() => chain);
  chain.set = vi.fn(() => chain);
  chain.insert = vi.fn(() => chain);
  chain.update = vi.fn(() => chain);
  chain.delete = vi.fn(() => chain);
  // Drizzle query builders are thenable — make the chain resolve to `terminal`.
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

const rbac = await import('../../src/modules/rbac/rbac.service.js');

describe('rbac.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getUserPermissions / checkPermission (the security-critical path)', () => {
    it('returns the permissions granted via the user’s roles', async () => {
      // 1) userRoles for the user → 2) role_permissions → 3) permissions
      dbMock.select
        .mockReturnValueOnce(createChain([{ roleId: 'role-1' }]))
        .mockReturnValueOnce(createChain([{ permissionId: 'perm-1' }]))
        .mockReturnValueOnce(createChain([{ id: 'perm-1', name: 'tenants:read' }]));

      const perms = await rbac.getUserPermissions('user-1');

      expect(perms).toEqual([{ id: 'perm-1', name: 'tenants:read' }]);
    });

    it('checkPermission returns true when the role grants the named permission', async () => {
      dbMock.select
        .mockReturnValueOnce(createChain([{ roleId: 'role-1' }]))
        .mockReturnValueOnce(createChain([{ permissionId: 'perm-1' }]))
        .mockReturnValueOnce(createChain([{ id: 'perm-1', name: 'tenants:read' }]));

      expect(await rbac.checkPermission('user-1', 'tenants:read')).toBe(true);
    });

    it('checkPermission returns false when the permission is not granted', async () => {
      dbMock.select
        .mockReturnValueOnce(createChain([{ roleId: 'role-1' }]))
        .mockReturnValueOnce(createChain([{ permissionId: 'perm-1' }]))
        .mockReturnValueOnce(createChain([{ id: 'perm-1', name: 'tenants:read' }]));

      expect(await rbac.checkPermission('user-1', 'tenants:delete')).toBe(false);
    });

    it('returns empty (deny-by-default) when the user has no roles', async () => {
      // empty userRoles → both getUserPermissions and checkPermission short-circuit
      dbMock.select.mockReturnValue(createChain([]));

      expect(await rbac.getUserPermissions('user-1')).toEqual([]);
      expect(await rbac.checkPermission('user-1', 'tenants:read')).toBe(false);
      // short-circuits after the first query each call — never reaches role_permissions/permissions
      expect(dbMock.select).toHaveBeenCalledTimes(2);
    });

    it('returns empty when roles exist but grant no permissions', async () => {
      dbMock.select
        .mockReturnValueOnce(createChain([{ roleId: 'role-1' }]))
        .mockReturnValueOnce(createChain([]));

      expect(await rbac.getUserPermissions('user-1')).toEqual([]);
    });
  });

  describe('createRole', () => {
    it('inserts a non-system role and returns its id', async () => {
      const insertChain = createChain(undefined);
      dbMock.insert.mockReturnValue(insertChain);

      const id = await rbac.createRole({ name: 'editor', description: 'Edits content' });

      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
      expect(insertChain.values).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'editor', description: 'Edits content', isSystem: false }),
      );
    });

    it('also inserts role-permission mappings when permissionIds are provided', async () => {
      const insertChain = createChain(undefined);
      dbMock.insert.mockReturnValue(insertChain);

      await rbac.createRole({ name: 'editor', permissionIds: ['perm-1', 'perm-2'] });

      // first insert = role, second insert = role_permissions rows
      expect(dbMock.insert).toHaveBeenCalledTimes(2);
      expect(insertChain.values).toHaveBeenLastCalledWith([
        { roleId: expect.any(String), permissionId: 'perm-1' },
        { roleId: expect.any(String), permissionId: 'perm-2' },
      ]);
    });
  });

  describe('guard rails', () => {
    it('updateRole throws when the role does not exist', async () => {
      dbMock.select.mockReturnValueOnce(createChain([]));
      await expect(rbac.updateRole('missing', { name: 'x' })).rejects.toThrow('Role not found');
    });

    it('updateRole refuses to rename a system role', async () => {
      dbMock.select.mockReturnValueOnce(createChain([{ id: 'r', isSystem: true }]));
      await expect(rbac.updateRole('r', { name: 'x' })).rejects.toThrow(/system role/);
    });

    it('deleteRole refuses to delete a system role', async () => {
      dbMock.select.mockReturnValueOnce(createChain([{ id: 'r', isSystem: true }]));
      await expect(rbac.deleteRole('r')).rejects.toThrow('Cannot delete system role');
    });

    it('assignPermission throws when the role does not exist', async () => {
      dbMock.select.mockReturnValueOnce(createChain([]));
      await expect(rbac.assignPermission('missing', 'perm-1')).rejects.toThrow('Role not found');
      expect(dbMock.insert).not.toHaveBeenCalled();
    });

    it('assignPermission is idempotent when the mapping already exists', async () => {
      dbMock.select
        .mockReturnValueOnce(createChain([{ id: 'role-1' }])) // role exists
        .mockReturnValueOnce(createChain([{ id: 'perm-1' }])) // permission exists
        .mockReturnValueOnce(createChain([{ roleId: 'role-1', permissionId: 'perm-1' }])); // already mapped

      await rbac.assignPermission('role-1', 'perm-1');

      expect(dbMock.insert).not.toHaveBeenCalled();
    });

    it('setRolePermissions refuses to modify a system role', async () => {
      dbMock.select.mockReturnValueOnce(createChain([{ id: 'r', isSystem: true }]));
      await expect(rbac.setRolePermissions('r', ['perm-1'])).rejects.toThrow(/system role/);
    });
  });
});
