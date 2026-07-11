// Better Auth tables (user, session, account, verification)

// Audit
export * from './audit-log.js';
export * from './auth.js';
// Notifications (persistent per-user notification log)
export { notifications } from './notification.js';
// RBAC tables (role.ts defines roles, permissions, rolePermissions, userRoles)
export { permissions, rolePermissions, roles, userRoles } from './role.js';
// Settings tables (setting.ts defines settings + integrations)
export { integrations, settings } from './setting.js';
// Site adapters (per-tenant dynamic plugins for consumer sites)
export { siteAdapters } from './site-adapter.js';
// Billing tables (subscription.ts defines subscriptions + invoices)
export { invoices, subscriptions } from './subscription.js';
// Tenant and User tables
export * from './tenant.js';
export * from './user.js';
export * from './user-tenant-access.js';
export { siteMemberships } from './site-membership.js';
export * from './site-invite.js';
export * from './integration-operation.js';

// Webhooks
export * from './webhook.js';

// Drizzle Relations
import { relations } from 'drizzle-orm';
import { auditLogs } from './audit-log.js';
import { permissions, rolePermissions, roles, userRoles } from './role.js';
import { integrations } from './setting.js';
import { invoices, subscriptions } from './subscription.js';
import { siteAdapters } from './site-adapter.js';
import { siteInvites } from './site-invite.js';
import { siteMemberships } from './site-membership.js';
import { tenants } from './tenant.js';
import { users } from './user.js';
import { userTenantAccess } from './user-tenant-access.js';

export const tenantsRelations = relations(tenants, ({ many }) => ({
  users: many(userTenantAccess),
  subscriptions: many(subscriptions),
  invoices: many(invoices),
  auditLogs: many(auditLogs),
  integrations: many(integrations),
  siteAdapters: many(siteAdapters),
}));

export const siteAdaptersRelations = relations(siteAdapters, ({ many, one }) => ({
  tenant: one(tenants, { fields: [siteAdapters.tenantId], references: [tenants.id] }),
  memberships: many(siteMemberships),
}));

export const siteInvitesRelations = relations(siteInvites, ({ one }) => ({
  tenant: one(tenants, { fields: [siteInvites.tenantId], references: [tenants.id] }),
  siteAdapter: one(siteAdapters, {
    fields: [siteInvites.siteAdapterId],
    references: [siteAdapters.id],
  }),
}));

export const siteMembershipsRelations = relations(siteMemberships, ({ one }) => ({
  user: one(users, { fields: [siteMemberships.userId], references: [users.id] }),
  siteAdapter: one(siteAdapters, {
    fields: [siteMemberships.siteAdapterId],
    references: [siteAdapters.id],
  }),
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
