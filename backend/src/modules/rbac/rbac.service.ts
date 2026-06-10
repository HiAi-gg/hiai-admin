import { db } from '../../lib/db.js';
import { roles, permissions, rolePermissions, userRoles, users } from '../../db/schema/index.js';
import { eq, and, inArray, like, or, count } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';

export type RoleWithPermissions = {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean | null;
  createdAt: Date;
  updatedAt: Date;
  permissions: string[];
};

export async function createRole(data: {
  name: string;
  description?: string;
  permissionIds?: string[];
}): Promise<string> {
  const roleId = randomUUID();
  await db.insert(roles).values({
    id: roleId,
    name: data.name,
    description: data.description ?? null,
    isSystem: false,
  });

  if (data.permissionIds?.length) {
    await db
      .insert(rolePermissions)
      .values(data.permissionIds.map((pid) => ({ roleId, permissionId: pid })));
  }

  return roleId;
}

export async function updateRole(
  id: string,
  data: { name?: string; description?: string; permissionIds?: string[] },
): Promise<void> {
  const existing = await db.select().from(roles).where(eq(roles.id, id)).limit(1);
  if (!existing[0]) throw new Error('Role not found');
  if (existing[0].isSystem && (data.name || data.permissionIds)) {
    throw new Error('Cannot rename or change permissions of system role');
  }

  const patch: Partial<{ name: string; description: string | null; updatedAt: Date }> = {};
  if (data.name) patch.name = data.name;
  if (data.description !== undefined) patch.description = data.description;
  if (Object.keys(patch).length) {
    patch.updatedAt = new Date();
    await db.update(roles).set(patch).where(eq(roles.id, id));
  }

  if (data.permissionIds) {
    await db.delete(rolePermissions).where(eq(rolePermissions.roleId, id));
    if (data.permissionIds.length) {
      await db
        .insert(rolePermissions)
        .values(data.permissionIds.map((pid) => ({ roleId: id, permissionId: pid })));
    }
  }
}

export async function deleteRole(id: string): Promise<void> {
  const existing = await db.select().from(roles).where(eq(roles.id, id)).limit(1);
  if (!existing[0]) throw new Error('Role not found');
  if (existing[0].isSystem) throw new Error('Cannot delete system role');

  await db.delete(rolePermissions).where(eq(rolePermissions.roleId, id));
  await db.delete(userRoles).where(eq(userRoles.roleId, id));
  await db.delete(roles).where(eq(roles.id, id));
}

export async function listRoles(): Promise<RoleWithPermissions[]> {
  const allRoles = await db.select().from(roles);
  const allMappings = await db.select().from(rolePermissions);

  return allRoles.map((role) => ({
    ...role,
    permissions: allMappings.filter((m) => m.roleId === role.id).map((m) => m.permissionId),
  }));
}

export async function getRole(id: string): Promise<RoleWithPermissions | null> {
  const role = await db.select().from(roles).where(eq(roles.id, id)).limit(1);
  if (!role[0]) return null;
  const mappings = await db.select().from(rolePermissions).where(eq(rolePermissions.roleId, id));
  return { ...role[0], permissions: mappings.map((m) => m.permissionId) };
}

export async function listPermissions() {
  return db.select().from(permissions);
}

export async function getPermission(id: string) {
  const [perm] = await db.select().from(permissions).where(eq(permissions.id, id)).limit(1);
  return perm || null;
}

export async function createPermission(data: {
  name: string;
  resource: string;
  action: string;
  description?: string;
}): Promise<string> {
  const existing = await db
    .select()
    .from(permissions)
    .where(eq(permissions.name, data.name))
    .limit(1);
  if (existing[0]) throw new Error(`Permission "${data.name}" already exists`);

  const id = `perm_${data.resource}_${data.action}_${randomUUID().slice(0, 8)}`;
  await db.insert(permissions).values({
    id,
    name: data.name,
    resource: data.resource,
    action: data.action,
    description: data.description ?? null,
  });
  return id;
}

export async function updatePermission(
  id: string,
  data: { name?: string; resource?: string; action?: string; description?: string },
): Promise<void> {
  const existing = await db.select().from(permissions).where(eq(permissions.id, id)).limit(1);
  if (!existing[0]) throw new Error('Permission not found');

  const patch: Partial<{
    name: string;
    resource: string;
    action: string;
    description: string | null;
  }> = {};
  if (data.name) patch.name = data.name;
  if (data.resource) patch.resource = data.resource;
  if (data.action) patch.action = data.action;
  if (data.description !== undefined) patch.description = data.description;
  if (Object.keys(patch).length) {
    await db.update(permissions).set(patch).where(eq(permissions.id, id));
  }
}

export async function deletePermission(id: string): Promise<void> {
  await db.delete(rolePermissions).where(eq(rolePermissions.permissionId, id));
  await db.delete(permissions).where(eq(permissions.id, id));
}

export async function assignPermission(roleId: string, permissionId: string): Promise<void> {
  const role = await db.select().from(roles).where(eq(roles.id, roleId)).limit(1);
  if (!role[0]) throw new Error('Role not found');
  const perm = await db.select().from(permissions).where(eq(permissions.id, permissionId)).limit(1);
  if (!perm[0]) throw new Error('Permission not found');

  const existing = await db
    .select()
    .from(rolePermissions)
    .where(and(eq(rolePermissions.roleId, roleId), eq(rolePermissions.permissionId, permissionId)))
    .limit(1);
  if (existing.length) return;

  await db.insert(rolePermissions).values({ roleId, permissionId });
}

export async function revokePermission(roleId: string, permissionId: string): Promise<void> {
  await db
    .delete(rolePermissions)
    .where(and(eq(rolePermissions.roleId, roleId), eq(rolePermissions.permissionId, permissionId)));
}

export async function setRolePermissions(roleId: string, permissionIds: string[]): Promise<void> {
  const role = await db.select().from(roles).where(eq(roles.id, roleId)).limit(1);
  if (!role[0]) throw new Error('Role not found');
  if (role[0].isSystem) throw new Error('Cannot modify system role permissions');

  await db.delete(rolePermissions).where(eq(rolePermissions.roleId, roleId));
  if (permissionIds.length) {
    await db
      .insert(rolePermissions)
      .values(permissionIds.map((pid) => ({ roleId, permissionId: pid })));
  }
}

export type UserWithRoles = {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  role: string;
  createdAt: Date;
  roleIds: string[];
};

export async function listUsersWithRoles(
  options: { search?: string; page?: number; limit?: number } = {},
) {
  const { search, page = 1, limit = 50 } = options;
  const offset = (page - 1) * limit;

  const where = search
    ? or(like(users.email, `%${search}%`), like(users.name, `%${search}%`))
    : undefined;

  const userRows = await (where
    ? db.select().from(users).where(where).limit(limit).offset(offset)
    : db.select().from(users).limit(limit).offset(offset));

  const totalRows = await (where
    ? db.select({ c: count() }).from(users).where(where)
    : db.select({ c: count() }).from(users));

  const userIds = userRows.map((u) => u.id);
  const roleRows = userIds.length
    ? await db.select().from(userRoles).where(inArray(userRoles.userId, userIds))
    : [];

  return {
    items: userRows.map((u) => ({
      ...u,
      roleIds: roleRows.filter((r) => r.userId === u.id).map((r) => r.roleId),
    })) as UserWithRoles[],
    pagination: {
      page,
      limit,
      total: totalRows[0]?.c || 0,
      totalPages: Math.ceil((totalRows[0]?.c || 0) / limit),
    },
  };
}

export async function listUserRoles(userId: string) {
  const assignments = await db.select().from(userRoles).where(eq(userRoles.userId, userId));
  const roleIds = assignments.map((a) => a.roleId);
  if (!roleIds.length) return [];
  return db.select().from(roles).where(inArray(roles.id, roleIds));
}

export async function assignRoleToUser(
  userId: string,
  roleId: string,
  tenantId?: string | null,
  grantedBy?: string,
): Promise<void> {
  const role = await db.select().from(roles).where(eq(roles.id, roleId)).limit(1);
  if (!role[0]) throw new Error('Role not found');

  const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user[0]) throw new Error('User not found');

  const conditions = tenantId
    ? and(
        eq(userRoles.userId, userId),
        eq(userRoles.roleId, roleId),
        eq(userRoles.tenantId, tenantId),
      )
    : and(eq(userRoles.userId, userId), eq(userRoles.roleId, roleId));

  const existing = await db.select().from(userRoles).where(conditions).limit(1);
  if (existing.length) return;

  await db.insert(userRoles).values({
    userId,
    roleId,
    tenantId: tenantId || null,
    grantedBy: grantedBy || null,
    grantedAt: new Date(),
  });
}

export async function revokeRoleFromUser(
  userId: string,
  roleId: string,
  tenantId?: string | null,
): Promise<void> {
  const conditions = tenantId
    ? and(
        eq(userRoles.userId, userId),
        eq(userRoles.roleId, roleId),
        eq(userRoles.tenantId, tenantId),
      )
    : and(eq(userRoles.userId, userId), eq(userRoles.roleId, roleId));

  await db.delete(userRoles).where(conditions);
}

export async function getUserPermissions(userId: string, tenantId?: string) {
  const conditions = tenantId
    ? and(eq(userRoles.userId, userId), eq(userRoles.tenantId, tenantId))
    : eq(userRoles.userId, userId);

  const userRoleRows = await db.select().from(userRoles).where(conditions);
  const roleIds = userRoleRows.map((r) => r.roleId);
  if (!roleIds.length) return [];

  const rolePermRows = await db
    .select()
    .from(rolePermissions)
    .where(inArray(rolePermissions.roleId, roleIds));
  const permIds = [...new Set(rolePermRows.map((r) => r.permissionId))];
  if (!permIds.length) return [];

  const permRows = await db.select().from(permissions).where(inArray(permissions.id, permIds));

  return permRows;
}

export async function checkPermission(userId: string, permissionName: string, tenantId?: string) {
  const userPerms = await getUserPermissions(userId, tenantId);
  return userPerms.some((p) => p.name === permissionName);
}
