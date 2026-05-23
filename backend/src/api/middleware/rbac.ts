import { Elysia } from 'elysia';
import { checkPermission as _checkPermission } from '../../modules/rbac/rbac.service.js';

export const rbacMiddleware = new Elysia({ name: 'rbac' })
  .macro({
    requirePermission: (permission: string) => ({
      resolve: async (ctx: any) => {
        const { set } = ctx;
        const user = (ctx as any).user;
        if (!user) { set.status = 401; throw new Error('Unauthorized'); }
        if (user.role === 'super_admin') return { user };
        const has = await _checkPermission(user.id, permission);
        if (!has) { set.status = 403; throw new Error(`Forbidden — requires: ${permission}`); }
        return { user };
      },
    }),
  });
