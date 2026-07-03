import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { db } from '../lib/db.js';
import {
  permissions,
  rolePermissions,
  roles,
  subscriptions,
  tenants,
  userRoles,
  users,
} from './schema/index.js';

async function seed() {
  console.log('🌱 Seeding hiai-admin database...');

  const perms = [
    {
      id: 'perm_tenants_read',
      name: 'tenants:read',
      resource: 'tenants',
      action: 'read',
      description: 'View tenants',
    },
    {
      id: 'perm_tenants_write',
      name: 'tenants:write',
      resource: 'tenants',
      action: 'write',
      description: 'Create/update tenants',
    },
    {
      id: 'perm_tenants_delete',
      name: 'tenants:delete',
      resource: 'tenants',
      action: 'delete',
      description: 'Delete tenants',
    },
    {
      id: 'perm_tenants_suspend',
      name: 'tenants:suspend',
      resource: 'tenants',
      action: 'suspend',
      description: 'Suspend/reactivate tenants',
    },
    {
      id: 'perm_users_read',
      name: 'users:read',
      resource: 'users',
      action: 'read',
      description: 'View users',
    },
    {
      id: 'perm_users_write',
      name: 'users:write',
      resource: 'users',
      action: 'write',
      description: 'Create/update users',
    },
    {
      id: 'perm_users_delete',
      name: 'users:delete',
      resource: 'users',
      action: 'delete',
      description: 'Delete users',
    },
    {
      id: 'perm_billing_read',
      name: 'billing:read',
      resource: 'billing',
      action: 'read',
      description: 'View billing',
    },
    {
      id: 'perm_billing_write',
      name: 'billing:write',
      resource: 'billing',
      action: 'write',
      description: 'Manage billing',
    },
    {
      id: 'perm_billing_refund',
      name: 'billing:refund',
      resource: 'billing',
      action: 'refund',
      description: 'Issue refunds',
    },
    {
      id: 'perm_audit_read',
      name: 'audit:read',
      resource: 'audit',
      action: 'read',
      description: 'View audit logs',
    },
    {
      id: 'perm_audit_export',
      name: 'audit:export',
      resource: 'audit',
      action: 'export',
      description: 'Export audit logs',
    },
    {
      id: 'perm_settings_read',
      name: 'settings:read',
      resource: 'settings',
      action: 'read',
      description: 'View settings',
    },
    {
      id: 'perm_settings_write',
      name: 'settings:write',
      resource: 'settings',
      action: 'write',
      description: 'Manage settings',
    },
    {
      id: 'perm_integrations_read',
      name: 'integrations:read',
      resource: 'integrations',
      action: 'read',
      description: 'View integrations',
    },
    {
      id: 'perm_integrations_write',
      name: 'integrations:write',
      resource: 'integrations',
      action: 'write',
      description: 'Manage integrations',
    },
    {
      id: 'perm_roles_read',
      name: 'roles:read',
      resource: 'roles',
      action: 'read',
      description: 'View roles and permissions',
    },
    {
      id: 'perm_roles_write',
      name: 'roles:write',
      resource: 'roles',
      action: 'write',
      description: 'Create/update roles and permissions',
    },
    {
      id: 'perm_roles_delete',
      name: 'roles:delete',
      resource: 'roles',
      action: 'delete',
      description: 'Delete roles and permissions',
    },
    {
      id: 'perm_analytics_read',
      name: 'analytics:read',
      resource: 'analytics',
      action: 'read',
      description: 'View platform analytics',
    },
    {
      id: 'perm_analytics_export',
      name: 'analytics:export',
      resource: 'analytics',
      action: 'export',
      description: 'Export analytics reports',
    },
  ];

  for (const p of perms) {
    await db.insert(permissions).values(p).onConflictDoNothing();
  }
  console.log(`  ✅ ${perms.length} permissions seeded`);

  const roleData = [
    {
      id: 'role_super_admin',
      name: 'super_admin',
      description: 'Full platform access',
      isSystem: true,
    },
    {
      id: 'role_tenant_admin',
      name: 'tenant_admin',
      description: 'Manage own tenant',
      isSystem: true,
    },
    { id: 'role_editor', name: 'editor', description: 'Edit content', isSystem: true },
    { id: 'role_viewer', name: 'viewer', description: 'Read-only access', isSystem: true },
    {
      id: 'role_billing_manager',
      name: 'billing_manager',
      description: 'Manage billing and subscriptions',
      isSystem: true,
    },
    {
      id: 'role_support_agent',
      name: 'support_agent',
      description: 'Customer support access',
      isSystem: true,
    },
  ];

  for (const r of roleData) {
    await db.insert(roles).values(r).onConflictDoNothing();
  }
  console.log(`  ✅ ${roleData.length} roles seeded`);

  const rolePermMappings = [
    ...perms.map((p) => ({ roleId: 'role_super_admin', permissionId: p.id })),
    { roleId: 'role_tenant_admin', permissionId: 'perm_tenants_read' },
    { roleId: 'role_tenant_admin', permissionId: 'perm_tenants_write' },
    { roleId: 'role_tenant_admin', permissionId: 'perm_users_read' },
    { roleId: 'role_tenant_admin', permissionId: 'perm_users_write' },
    { roleId: 'role_tenant_admin', permissionId: 'perm_billing_read' },
    { roleId: 'role_tenant_admin', permissionId: 'perm_audit_read' },
    { roleId: 'role_tenant_admin', permissionId: 'perm_settings_read' },
    { roleId: 'role_tenant_admin', permissionId: 'perm_settings_write' },
    { roleId: 'role_tenant_admin', permissionId: 'perm_integrations_read' },
    { roleId: 'role_tenant_admin', permissionId: 'perm_integrations_write' },
    { roleId: 'role_tenant_admin', permissionId: 'perm_analytics_read' },
    { roleId: 'role_editor', permissionId: 'perm_tenants_read' },
    { roleId: 'role_editor', permissionId: 'perm_users_read' },
    { roleId: 'role_editor', permissionId: 'perm_settings_read' },
    { roleId: 'role_editor', permissionId: 'perm_analytics_read' },
    { roleId: 'role_viewer', permissionId: 'perm_tenants_read' },
    { roleId: 'role_viewer', permissionId: 'perm_analytics_read' },
    { roleId: 'role_billing_manager', permissionId: 'perm_billing_read' },
    { roleId: 'role_billing_manager', permissionId: 'perm_billing_write' },
    { roleId: 'role_billing_manager', permissionId: 'perm_billing_refund' },
    { roleId: 'role_billing_manager', permissionId: 'perm_tenants_read' },
    { roleId: 'role_billing_manager', permissionId: 'perm_audit_read' },
    { roleId: 'role_billing_manager', permissionId: 'perm_analytics_read' },
    { roleId: 'role_support_agent', permissionId: 'perm_tenants_read' },
    { roleId: 'role_support_agent', permissionId: 'perm_users_read' },
    { roleId: 'role_support_agent', permissionId: 'perm_billing_read' },
    { roleId: 'role_support_agent', permissionId: 'perm_audit_read' },
  ];

  for (const rp of rolePermMappings) {
    await db.insert(rolePermissions).values(rp).onConflictDoNothing();
  }
  console.log(`  ✅ ${rolePermMappings.length} role-permission mappings seeded`);

  // Idempotent lookup-or-insert: on a 2nd seed run (e.g. container restart
  // with a persistent volume) the slug conflict makes the insert a no-op,
  // so we fall back to the existing tenant id instead of generating a new
  // UUID that would FK-fail later when userRoles reference it.
  const existingDemoTenant = await db
    .select({ id: tenants.id })
    .from(tenants)
    .where(eq(tenants.slug, 'demo-store'))
    .limit(1);
  let tenantId: string;
  if (existingDemoTenant[0]) {
    tenantId = existingDemoTenant[0].id;
  } else {
    const inserted = await db
      .insert(tenants)
      .values({
        id: randomUUID(),
        slug: 'demo-store',
        name: 'Demo Store',
        email: 'admin@demo.hiai.store',
        status: 'active',
        plan: 'pro',
      })
      .returning();
    if (!inserted[0]) throw new Error('Failed to insert demo tenant');
    tenantId = inserted[0].id;
  }
  console.log('  ✅ Demo tenant seeded');

  const superAdminId = 'usr_super_admin_001';
  await db
    .insert(users)
    .values({
      id: superAdminId,
      email: 'admin@hiai.store',
      name: 'HiAi Admin',
      role: 'super_admin',
    })
    .onConflictDoNothing();
  console.log('  ✅ Super admin user seeded');

  await db
    .insert(userRoles)
    .values({
      userId: superAdminId,
      roleId: 'role_super_admin',
      tenantId: null,
    })
    .onConflictDoNothing();
  console.log('  ✅ Super admin role assigned');

  const seedUsers = [
    {
      id: 'usr_demo_owner',
      email: 'owner@demo.hiai.store',
      name: 'Demo Owner',
      role: 'tenant_admin',
    },
    { id: 'usr_demo_editor', email: 'editor@demo.hiai.store', name: 'Demo Editor', role: 'editor' },
    {
      id: 'usr_demo_billing',
      email: 'billing@demo.hiai.store',
      name: 'Demo Billing',
      role: 'billing_manager',
    },
    {
      id: 'usr_demo_support',
      email: 'support@demo.hiai.store',
      name: 'Demo Support',
      role: 'support_agent',
    },
    { id: 'usr_demo_viewer', email: 'viewer@demo.hiai.store', name: 'Demo Viewer', role: 'viewer' },
  ];

  for (const u of seedUsers) {
    await db.insert(users).values(u).onConflictDoNothing();
  }
  console.log(`  ✅ ${seedUsers.length} demo users seeded`);

  const userRoleAssignments = [
    { userId: 'usr_demo_owner', roleId: 'role_tenant_admin', tenantId },
    { userId: 'usr_demo_editor', roleId: 'role_editor', tenantId },
    { userId: 'usr_demo_billing', roleId: 'role_billing_manager', tenantId },
    { userId: 'usr_demo_support', roleId: 'role_support_agent', tenantId },
    { userId: 'usr_demo_viewer', roleId: 'role_viewer', tenantId },
  ];

  for (const ur of userRoleAssignments) {
    await db
      .insert(userRoles)
      .values({ ...ur, grantedBy: superAdminId })
      .onConflictDoNothing();
  }
  console.log(`  ✅ ${userRoleAssignments.length} demo user-role assignments seeded`);

  await db
    .insert(subscriptions)
    .values({
      id: randomUUID(),
      tenantId,
      plan: 'pro',
      status: 'active',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    })
    .onConflictDoNothing();
  console.log('  ✅ Demo subscription seeded');

  console.log('\n🎉 Seed complete!');
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
