import { describe, it, expect } from 'bun:test';

describe('RBAC Service', () => {
  it('should export all required functions', async () => {
    const mod = await import('../modules/rbac/rbac.service.js');
    expect(typeof mod.createRole).toBe('function');
    expect(typeof mod.updateRole).toBe('function');
    expect(typeof mod.deleteRole).toBe('function');
    expect(typeof mod.listRoles).toBe('function');
    expect(typeof mod.assignPermission).toBe('function');
    expect(typeof mod.revokePermission).toBe('function');
    expect(typeof mod.getUserPermissions).toBe('function');
    expect(typeof mod.checkPermission).toBe('function');
  });

  it('RBAC middleware should export required function', async () => {
    const mod = await import('../api/middleware/rbac.js');
    expect(mod.rbacMiddleware).toBeDefined();
  });
});
