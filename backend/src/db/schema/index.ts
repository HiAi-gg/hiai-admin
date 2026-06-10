// Tenant and User tables
export * from './tenant.js';
export * from './user.js';
export * from './user-tenant-access.js';

// RBAC tables (role.ts defines roles, permissions, rolePermissions, userRoles)
export { roles, permissions, rolePermissions, userRoles } from './role.js';

// Billing tables (subscription.ts defines subscriptions + invoices)
export { subscriptions, invoices } from './subscription.js';

// Settings tables (setting.ts defines settings + integrations)
export { settings, integrations } from './setting.js';

// Audit
export * from './audit-log.js';

// Webhooks
export * from './webhook.js';

// Drizzle Relations
import { relations } from 'drizzle-orm';
import { tenants } from './tenant.js';
import { users } from './user.js';
import { userTenantAccess } from './user-tenant-access.js';
import { roles, permissions, rolePermissions, userRoles } from './role.js';
import { subscriptions, invoices } from './subscription.js';
import { auditLogs } from './audit-log.js';
import { integrations } from './setting.js';

export const tenantsRelations = relations(tenants, ({ many }) => ({
  users: many(userTenantAccess),
  subscriptions: many(subscriptions),
  invoices: many(invoices),
  auditLogs: many(auditLogs),
  integrations: many(integrations),
}));

export const usersRelations = relations(users, ({ many }) => ({
  tenantAccess: many(userTenantAccess),
  roles: many(userRoles),
}));

export const userTenantAccessRelations = relations(userTenantAccess, ({ one }) => ({
  tenant: one(tenants, { fields: [userTenantAccess.tenantId], references: [tenants.id] }),
  user: one(users, { fields: [userTenantAccess.userId], references: [users.id] }),
}));

export const rolesRelations = relations(roles, ({ many }) => ({
  permissions: many(rolePermissions),
  users: many(userRoles),
}));

export const permissionsRelations = relations(permissions, ({ many }) => ({
  roles: many(rolePermissions),
}));

export const rolePermissionsRelations = relations(rolePermissions, ({ one }) => ({
  role: one(roles, { fields: [rolePermissions.roleId], references: [roles.id] }),
  permission: one(permissions, {
    fields: [rolePermissions.permissionId],
    references: [permissions.id],
  }),
}));

export const userRolesRelations = relations(userRoles, ({ one }) => ({
  user: one(users, { fields: [userRoles.userId], references: [users.id] }),
  role: one(roles, { fields: [userRoles.roleId], references: [roles.id] }),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  tenant: one(tenants, { fields: [subscriptions.tenantId], references: [tenants.id] }),
}));

export const invoicesRelations = relations(invoices, ({ one }) => ({
  tenant: one(tenants, { fields: [invoices.tenantId], references: [tenants.id] }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  actor: one(users, { fields: [auditLogs.actorId], references: [users.id] }),
}));
