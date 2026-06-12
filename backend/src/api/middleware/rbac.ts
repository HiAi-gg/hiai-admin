import { Elysia } from 'elysia';
import { checkPermission as _checkPermission } from '../../modules/rbac/rbac.service.js';

export const rbacMiddleware = new Elysia({ name: 'rbac' }).macro({
  requirePermission: (permission: string) => ({
    beforeHandle: async (ctx: any) => {
      const { set } = ctx;
      const user = ctx.user;
      if (!user) {
        set.status = 401;
        return { error: 'Unauthorized' };
      }
      if (user.role === 'super_admin') return;
      const has = await _checkPermission(user.id, permission);
      if (!has) {
        set.status = 403;
        return { error: `Forbidden — requires: ${permission}` };
      }
    },
  }),
});
