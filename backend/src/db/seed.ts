import { randomUUID } from 'node:crypto';
import { eq, sql } from 'drizzle-orm';
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

/**
 * Idempotent seed.
 *
 * Whole flow runs inside a single transaction so re-execution (e.g. container
 * restart on a persistent volume) is safe:
 *   - permissions / roles / role-permission mappings  -> ON CONFLICT DO NOTHING
 *   - users (incl. seed IDs)                          -> ON CONFLICT DO UPDATE (name/role refresh)
 *   - demo tenant                                     -> lookup-or-insert by slug
 *   - user-role assignments for the demo tenant       -> cleared and re-inserted
 *
 * Adding the `admin` role (Phase 3 role-enum compatibility): webs and other
 * downstream consumers expect an `admin` role in JWT claims; we expose the
 * same RBAC level under both `admin` and `tenant_admin`, with `admin` being
 * the new public-facing name and `tenant_admin` kept for back-compat.
 */
async function seed() {
  console.log('Seeding hiai-admin database...');

  await db.transaction(async (tx) => {
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
      await tx.insert(permissions).values(p).onConflictDoNothing();
    }
    console.log(`  [+] ${perms.length} permissions seeded (idempotent)`);

    const roleData = [
      {
        id: 'role_super_admin',
        name: 'super_admin',
        description: 'Full platform access (cross-tenant, all sites)',
        isSystem: true,
      },
      {
        id: 'role_admin',
        name: 'admin',
        description: 'Public-facing alias for tenant_admin — same RBAC level',
        isSystem: true,
      },
      {
        id: 'role_tenant_admin',
        name: 'tenant_admin',
        description: 'Manage own tenant (legacy alias of admin)',
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
      await tx.insert(roles).values(r).onConflictDoNothing();
    }
    console.log(`  [+] ${roleData.length} roles seeded (idempotent)`);

    const tenantAdminAndAdminPermIds = new Set([
      'perm_tenants_read',
      'perm_tenants_write',
      'perm_users_read',
      'perm_users_write',
      'perm_billing_read',
      'perm_audit_read',
      'perm_settings_read',
      'perm_settings_write',
      'perm_integrations_read',
      'perm_integrations_write',
      'perm_analytics_read',
    ]);

    const rolePermMappings = [
      ...perms.map((p) => ({ roleId: 'role_super_admin', permissionId: p.id })),
      ...perms
        .filter((p) => tenantAdminAndAdminPermIds.has(p.id))
        .flatMap((p) => [
          { roleId: 'role_admin', permissionId: p.id },
          { roleId: 'role_tenant_admin', permissionId: p.id },
        ]),
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
      await tx.insert(rolePermissions).values(rp).onConflictDoNothing();
    }
    console.log(`  [+] ${rolePermMappings.length} role-permission mappings seeded (idempotent)`);

    const existingDemoTenant = await tx
      .select({ id: tenants.id })
      .from(tenants)
      .where(eq(tenants.slug, 'demo-store'))
      .limit(1);
    let tenantId: string;
    if (existingDemoTenant[0]) {
      tenantId = existingDemoTenant[0].id;
    } else {
      const inserted = await tx
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
    console.log('  [+] Demo tenant present');

    const superAdminId = 'usr_super_admin_001';
    await tx
      .insert(users)
      .values({
        id: superAdminId,
        email: 'admin@hiai.store',
        name: 'HiAi Admin',
        role: 'super_admin',
      })
      .onConflictDoUpdate({
        target: users.id,
        set: { name: sql`excluded.name`, role: sql`excluded.role`, updatedAt: new Date() },
      });
    console.log('  [+] Super admin user present');

    await tx
      .insert(userRoles)
      .values({
        userId: superAdminId,
        roleId: 'role_super_admin',
        tenantId: null,
      })
      .onConflictDoNothing();
    console.log('  [+] Super admin role assigned');

    const seedUsers = [
      { id: 'usr_demo_owner', email: 'owner@demo.hiai.store', name: 'Demo Owner', role: 'admin' },
      {
        id: 'usr_demo_owner_legacy',
        email: 'owner-legacy@demo.hiai.store',
        name: 'Demo Owner (legacy)',
        role: 'tenant_admin',
      },
      {
        id: 'usr_demo_editor',
        email: 'editor@demo.hiai.store',
        name: 'Demo Editor',
        role: 'editor',
      },
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
      {
        id: 'usr_demo_viewer',
        email: 'viewer@demo.hiai.store',
        name: 'Demo Viewer',
        role: 'viewer',
      },
    ];

    for (const u of seedUsers) {
      await tx
        .insert(users)
        .values(u)
        .onConflictDoUpdate({
          target: users.id,
          set: { name: sql`excluded.name`, role: sql`excluded.role`, updatedAt: new Date() },
        });
    }
    console.log(`  [+] ${seedUsers.length} demo users present`);

    const userRoleAssignments = [
      { userId: 'usr_demo_owner', roleId: 'role_admin', tenantId },
      { userId: 'usr_demo_owner_legacy', roleId: 'role_tenant_admin', tenantId },
      { userId: 'usr_demo_editor', roleId: 'role_editor', tenantId },
      { userId: 'usr_demo_billing', roleId: 'role_billing_manager', tenantId },
      { userId: 'usr_demo_support', roleId: 'role_support_agent', tenantId },
      { userId: 'usr_demo_viewer', roleId: 'role_viewer', tenantId },
    ];

    // Clear demo-tenant user_roles before re-applying — guarantees no
    // stale role assignments survive role renames between seed runs and
    // avoids the (user_id, role_id, tenant_id) unique-constraint masking
    // an obsolete grant with ON CONFLICT DO NOTHING.
    await tx.delete(userRoles).where(eq(userRoles.tenantId, tenantId));
    for (const ur of userRoleAssignments) {
      await tx
        .insert(userRoles)
        .values({ ...ur, grantedBy: superAdminId })
        .onConflictDoNothing();
    }
    console.log(`  [+] ${userRoleAssignments.length} demo user-role assignments reseeded`);

    await tx
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
    console.log('  [+] Demo subscription present');
  });

  console.log('\nSeed complete.');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
