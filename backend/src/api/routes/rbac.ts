import { Elysia, t } from 'elysia';
import { rbacMiddleware } from '../middleware/rbac.js';
import { auditMiddleware } from '../middleware/audit.js';
import * as rbac from '../../modules/rbac/rbac.service.js';

export const rbacRoutes = new Elysia({ prefix: '/api/rbac' })
  .use(rbacMiddleware)
  .use(auditMiddleware)

  .get(
    '/roles',
    async ({ query }) => {
      const page = Number(query.page) || 1;
      const limit = Number(query.limit) || 100;
      const all = await rbac.listRoles();
      const start = (page - 1) * limit;
      return {
        data: all.slice(start, start + limit),
        total: all.length,
        page,
        limit,
        totalPages: Math.ceil(all.length / limit),
      };
    },
    { requirePermission: 'roles:read' },
  )

  .get(
    '/roles/:id',
    async ({ params, set }) => {
      const role = await rbac.getRole(params.id);
      if (!role) {
        set.status = 404;
        return { error: 'Role not found' };
      }
      return { data: role };
    },
    { requirePermission: 'roles:read' },
  )

  .post(
    '/roles',
    async ({ body, set, user }) => {
      try {
        const id = await rbac.createRole(body);
        set.status = 201;
        return { id, grantedBy: (user as any)?.id };
      } catch (e: any) {
        set.status = 400;
        return { error: e.message };
      }
    },
    {
      requirePermission: 'roles:write',
      body: t.Object({
        name: t.String({ minLength: 1, maxLength: 100 }),
        description: t.Optional(t.String({ maxLength: 500 })),
        permissionIds: t.Optional(t.Array(t.String())),
      }),
    },
  )

  .put(
    '/roles/:id',
    async ({ params, body, set }) => {
      try {
        await rbac.updateRole(params.id, body);
        return { success: true };
      } catch (e: any) {
        set.status = 400;
        return { error: e.message };
      }
    },
    {
      requirePermission: 'roles:write',
      params: t.Object({ id: t.String() }),
      body: t.Object({
        name: t.Optional(t.String({ minLength: 1, maxLength: 100 })),
        description: t.Optional(t.String({ maxLength: 500 })),
        permissionIds: t.Optional(t.Array(t.String())),
      }),
    },
  )

  .delete(
    '/roles/:id',
    async ({ params, set }) => {
      try {
        await rbac.deleteRole(params.id);
        return { success: true };
      } catch (e: any) {
        set.status = 400;
        return { error: e.message };
      }
    },
    {
      requirePermission: 'roles:delete',
      params: t.Object({ id: t.String() }),
    },
  )

  .put(
    '/roles/:id/permissions',
    async ({ params, body, set }) => {
      try {
        await rbac.setRolePermissions(params.id, body.permissionIds);
        return { success: true, count: body.permissionIds.length };
      } catch (e: any) {
        set.status = 400;
        return { error: e.message };
      }
    },
    {
      requirePermission: 'roles:write',
      params: t.Object({ id: t.String() }),
      body: t.Object({ permissionIds: t.Array(t.String()) }),
    },
  )

  .post(
    '/roles/:roleId/permissions',
    async ({ params, body, set }) => {
      try {
        await rbac.assignPermission(params.roleId, body.permissionId);
        set.status = 201;
        return { success: true };
      } catch (e: any) {
        set.status = 400;
        return { error: e.message };
      }
    },
    {
      requirePermission: 'roles:write',
      params: t.Object({ roleId: t.String() }),
      body: t.Object({ permissionId: t.String() }),
    },
  )

  .delete(
    '/roles/:roleId/permissions/:permissionId',
    async ({ params, set }) => {
      try {
        await rbac.revokePermission(params.roleId, params.permissionId);
        return { success: true };
      } catch (e: any) {
        set.status = 400;
        return { error: e.message };
      }
    },
    {
      requirePermission: 'roles:write',
      params: t.Object({ roleId: t.String(), permissionId: t.String() }),
    },
  )

  .get(
    '/permissions',
    async () => {
      const data = await rbac.listPermissions();
      return { data };
    },
    { requirePermission: 'roles:read' },
  )

  .get(
    '/permissions/:id',
    async ({ params, set }) => {
      const perm = await rbac.getPermission(params.id);
      if (!perm) {
        set.status = 404;
        return { error: 'Permission not found' };
      }
      return { data: perm };
    },
    { requirePermission: 'roles:read' },
  )

  .post(
    '/permissions',
    async ({ body, set }) => {
      try {
        const id = await rbac.createPermission(body);
        set.status = 201;
        return { id };
      } catch (e: any) {
        set.status = 400;
        return { error: e.message };
      }
    },
    {
      requirePermission: 'roles:write',
      body: t.Object({
        name: t.String({ minLength: 3, maxLength: 100, pattern: '^[a-z]+:[a-z_]+$' }),
        resource: t.String({ minLength: 1, maxLength: 50 }),
        action: t.String({ minLength: 1, maxLength: 50 }),
        description: t.Optional(t.String({ maxLength: 500 })),
      }),
    },
  )

  .put(
    '/permissions/:id',
    async ({ params, body, set }) => {
      try {
        await rbac.updatePermission(params.id, body);
        return { success: true };
      } catch (e: any) {
        set.status = 400;
        return { error: e.message };
      }
    },
    {
      requirePermission: 'roles:write',
      params: t.Object({ id: t.String() }),
      body: t.Object({
        name: t.Optional(t.String({ minLength: 3, maxLength: 100 })),
        resource: t.Optional(t.String({ minLength: 1, maxLength: 50 })),
        action: t.Optional(t.String({ minLength: 1, maxLength: 50 })),
        description: t.Optional(t.String({ maxLength: 500 })),
      }),
    },
  )

  .delete(
    '/permissions/:id',
    async ({ params, set }) => {
      try {
        await rbac.deletePermission(params.id);
        return { success: true };
      } catch (e: any) {
        set.status = 400;
        return { error: e.message };
      }
    },
    {
      requirePermission: 'roles:delete',
      params: t.Object({ id: t.String() }),
    },
  )

  .get(
    '/users',
    async ({ query, set }) => {
      try {
        return await rbac.listUsersWithRoles({
          page: Number(query.page) || 1,
          limit: Number(query.limit) || 50,
          search: query.search as string,
        });
      } catch (e: any) {
        set.status = 500;
        return { error: e.message };
      }
    },
    { requirePermission: 'users:read' },
  )

  .get(
    '/users/:userId/roles',
    async ({ params, set }) => {
      try {
        const assigned = await rbac.listUserRoles(params.userId);
        return { data: assigned };
      } catch (e: any) {
        set.status = 500;
        return { error: e.message };
      }
    },
    { requirePermission: 'users:read' },
  )

  .post(
    '/users/:userId/roles',
    async ({ params, body, set, user }) => {
      try {
        await rbac.assignRoleToUser(params.userId, body.roleId, body.tenantId, (user as any)?.id);
        set.status = 201;
        return { success: true };
      } catch (e: any) {
        set.status = 400;
        return { error: e.message };
      }
    },
    {
      requirePermission: 'users:write',
      params: t.Object({ userId: t.String() }),
      body: t.Object({
        roleId: t.String(),
        tenantId: t.Optional(t.Union([t.String(), t.Null()])),
      }),
    },
  )

  .delete(
    '/users/:userId/roles/:roleId',
    async ({ params, query, set }) => {
      try {
        await rbac.revokeRoleFromUser(
          params.userId,
          params.roleId,
          (query.tenantId as string) || null,
        );
        return { success: true };
      } catch (e: any) {
        set.status = 400;
        return { error: e.message };
      }
    },
    {
      requirePermission: 'users:write',
      params: t.Object({ userId: t.String(), roleId: t.String() }),
      query: t.Object({ tenantId: t.Optional(t.String()) }),
    },
  )

  .get(
    '/matrix',
    async () => {
      const allRoles = await rbac.listRoles();
      const allPerms = await rbac.listPermissions();
      const matrix: Record<string, Record<string, boolean>> = {};
      for (const role of allRoles) {
        matrix[role.id] = {};
        for (const perm of allPerms) {
          matrix[role.id][perm.id] = role.permissions.includes(perm.id);
        }
      }
      return {
        roles: allRoles.map((r) => ({ id: r.id, name: r.name, isSystem: r.isSystem })),
        permissions: allPerms,
        matrix,
      };
    },
    { requirePermission: 'roles:read' },
  );
