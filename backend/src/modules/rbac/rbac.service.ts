import { db } from '../../lib/db.js';
import { roles, permissions, rolePermissions, userRoles } from '../../db/schema/index.js';
import { eq, and, inArray } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';

export async function createRole(data: { name: string; description?: string; permissionIds?: string[] }) {
  const roleId = randomUUID();
  await db.insert(roles).values({
    id: roleId,
    name: data.name,
    description: data.description ?? null,
    isSystem: false,
  });

  if (data.permissionIds?.length) {
    await db.insert(rolePermissions).values(
      data.permissionIds.map((pid) => ({ roleId, permissionId: pid }))
    );
  }

  return roleId;
}

export async function updateRole(id: string, data: { name?: string; description?: string; permissionIds?: string[] }) {
  const existing = await db.select().from(roles).where(eq(roles.id, id)).limit(1);
  if (!existing[0] || existing[0].isSystem) throw new Error('Cannot modify system role');

  if (data.name || data.description) {
    await db.update(roles).set({
      ...(data.name && { name: data.name }),
      ...(data.description !== undefined && { description: data.description }),
    }).where(eq(roles.id, id));
  }

  if (data.permissionIds) {
    await db.delete(rolePermissions).where(eq(rolePermissions.roleId, id));
    if (data.permissionIds.length) {
      await db.insert(rolePermissions).values(
        data.permissionIds.map((pid) => ({ roleId: id, permissionId: pid }))
      );
    }
  }
}

export async function deleteRole(id: string) {
  const existing = await db.select().from(roles).where(eq(roles.id, id)).limit(1);
  if (!existing[0] || existing[0].isSystem) throw new Error('Cannot delete system role');

  await db.delete(rolePermissions).where(eq(rolePermissions.roleId, id));
  await db.delete(userRoles).where(eq(userRoles.roleId, id));
  await db.delete(roles).where(eq(roles.id, id));
}

export async function listRoles() {
  const allRoles = await db.select().from(roles);
  const allMappings = await db.select().from(rolePermissions);

  return allRoles.map((role) => ({
    ...role,
    permissions: allMappings
      .filter((m) => m.roleId === role.id)
      .map((m) => m.permissionId),
  }));
}

export async function assignPermission(roleId: string, permissionId: string) {
  const existing = await db.select().from(rolePermissions)
    .where(and(eq(rolePermissions.roleId, roleId), eq(rolePermissions.permissionId, permissionId)))
    .limit(1);
  if (existing.length) return;

  await db.insert(rolePermissions).values({ roleId, permissionId });
}

export async function revokePermission(roleId: string, permissionId: string) {
  await db.delete(rolePermissions)
    .where(and(eq(rolePermissions.roleId, roleId), eq(rolePermissions.permissionId, permissionId)));
}

export async function getUserPermissions(userId: string, tenantId?: string) {
  const conditions = tenantId
    ? and(eq(userRoles.userId, userId), eq(userRoles.tenantId, tenantId))
    : eq(userRoles.userId, userId);

  const userRoleRows = await db.select().from(userRoles).where(conditions);
  const roleIds = userRoleRows.map((r) => r.roleId);
  if (!roleIds.length) return [];

  const rolePermRows = await db.select().from(rolePermissions)
    .where(inArray(rolePermissions.roleId, roleIds));
  const permIds = [...new Set(rolePermRows.map((r) => r.permissionId))];
  if (!permIds.length) return [];

  const permRows = await db.select().from(permissions)
    .where(inArray(permissions.id, permIds));

  return permRows;
}

export async function checkPermission(userId: string, permissionName: string, tenantId?: string) {
  const userPerms = await getUserPermissions(userId, tenantId);
  return userPerms.some((p) => p.name === permissionName);
}
