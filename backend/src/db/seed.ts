import { db } from '../lib/db.js';
import { roles, permissions, rolePermissions, userRoles, users, tenants, subscriptions } from './schema/index.js';
import { randomUUID } from 'node:crypto';

async function seed() {
  console.log('🌱 Seeding hiai-admin database...');

  // 1. Seed permissions
  const perms = [
    { id: 'perm_tenants_read', name: 'tenants:read', resource: 'tenants', action: 'read', description: 'View tenants' },
    { id: 'perm_tenants_write', name: 'tenants:write', resource: 'tenants', action: 'write', description: 'Create/update tenants' },
    { id: 'perm_tenants_delete', name: 'tenants:delete', resource: 'tenants', action: 'delete', description: 'Delete tenants' },
    { id: 'perm_users_read', name: 'users:read', resource: 'users', action: 'read', description: 'View users' },
    { id: 'perm_users_write', name: 'users:write', resource: 'users', action: 'write', description: 'Create/update users' },
    { id: 'perm_users_delete', name: 'users:delete', resource: 'users', action: 'delete', description: 'Delete users' },
    { id: 'perm_billing_read', name: 'billing:read', resource: 'billing', action: 'read', description: 'View billing' },
    { id: 'perm_billing_write', name: 'billing:write', resource: 'billing', action: 'write', description: 'Manage billing' },
    { id: 'perm_audit_read', name: 'audit:read', resource: 'audit', action: 'read', description: 'View audit logs' },
    { id: 'perm_settings_read', name: 'settings:read', resource: 'settings', action: 'read', description: 'View settings' },
    { id: 'perm_settings_write', name: 'settings:write', resource: 'settings', action: 'write', description: 'Manage settings' },
    { id: 'perm_integrations_read', name: 'integrations:read', resource: 'integrations', action: 'read', description: 'View integrations' },
    { id: 'perm_integrations_write', name: 'integrations:write', resource: 'integrations', action: 'write', description: 'Manage integrations' },
  ];

  for (const p of perms) {
    await db.insert(permissions).values(p).onConflictDoNothing();
  }
  console.log(`  ✅ ${perms.length} permissions seeded`);

  // 2. Seed roles
  const roleData = [
    { id: 'role_super_admin', name: 'super_admin', description: 'Full platform access', isSystem: true },
    { id: 'role_tenant_admin', name: 'tenant_admin', description: 'Manage own tenant', isSystem: true },
    { id: 'role_editor', name: 'editor', description: 'Edit content', isSystem: true },
    { id: 'role_viewer', name: 'viewer', description: 'Read-only access', isSystem: true },
  ];

  for (const r of roleData) {
    await db.insert(roles).values(r).onConflictDoNothing();
  }
  console.log(`  ✅ ${roleData.length} roles seeded`);

  // 3. Assign permissions to roles
  const rolePermMappings = [
    // super_admin gets all permissions
    ...perms.map((p) => ({ roleId: 'role_super_admin', permissionId: p.id })),
    // tenant_admin gets read/write for tenants, users, billing
    { roleId: 'role_tenant_admin', permissionId: 'perm_tenants_read' },
    { roleId: 'role_tenant_admin', permissionId: 'perm_tenants_write' },
    { roleId: 'role_tenant_admin', permissionId: 'perm_users_read' },
    { roleId: 'role_tenant_admin', permissionId: 'perm_users_write' },
    { roleId: 'role_tenant_admin', permissionId: 'perm_billing_read' },
    { roleId: 'role_tenant_admin', permissionId: 'perm_audit_read' },
    { roleId: 'role_tenant_admin', permissionId: 'perm_settings_read' },
    // editor gets read for tenants
    { roleId: 'role_editor', permissionId: 'perm_tenants_read' },
    { roleId: 'role_editor', permissionId: 'perm_users_read' },
    // viewer gets read for tenants
    { roleId: 'role_viewer', permissionId: 'perm_tenants_read' },
  ];

  for (const rp of rolePermMappings) {
    await db.insert(rolePermissions).values(rp).onConflictDoNothing();
  }
  console.log(`  ✅ ${rolePermMappings.length} role-permission mappings seeded`);

  // 4. Seed demo tenant
  const tenantId = randomUUID();
  await db.insert(tenants).values({
    id: tenantId,
    slug: 'demo-store',
    name: 'Demo Store',
    email: 'admin@demo.hiai.store',
    status: 'active',
    plan: 'pro',
  }).onConflictDoNothing();
  console.log('  ✅ Demo tenant seeded');

  // 5. Seed super admin user
  const superAdminId = 'usr_super_admin_001';
  await db.insert(users).values({
    id: superAdminId,
    email: 'admin@hiai.store',
    name: 'HiAi Admin',
    role: 'super_admin',
  }).onConflictDoNothing();
  console.log('  ✅ Super admin user seeded');

  // 6. Assign super_admin role to admin user
  await db.insert(userRoles).values({
    userId: superAdminId,
    roleId: 'role_super_admin',
    tenantId: null,
  }).onConflictDoNothing();
  console.log('  ✅ Super admin role assigned');

  // 7. Create subscription for demo tenant
  await db.insert(subscriptions).values({
    id: randomUUID(),
    tenantId,
    plan: 'pro',
    status: 'active',
    currentPeriodStart: new Date(),
    currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  }).onConflictDoNothing();
  console.log('  ✅ Demo subscription seeded');

  console.log('\n🎉 Seed complete!');
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
