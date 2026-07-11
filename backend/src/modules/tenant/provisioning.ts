import { tenantService } from './tenant.service.js';
import { db } from '../../lib/db.js';
import { users, userTenantAccess, userRoles, roles, tenants } from '../../db/schema/index.js';
import { eq, and } from 'drizzle-orm';
import { stripeService } from '../billing/stripe.service.js';
import { notificationService } from '../notifications/notification.service.js';
import { logger } from '../../lib/logger.js';
import { randomUUID } from 'node:crypto';

const log = logger.child({ module: 'provisioning' });

export async function provisionTenant(
  name: string,
  slug: string,
  ownerEmail: string,
  plan: string = 'free',
) {
  // 1. Create tenant
  const tenant = await tenantService.create({ name, slug, email: ownerEmail, plan });

  // 2. Create Stripe customer
  let ownerUserId: string | undefined;
  try {
    const customer = await stripeService.createCustomer(ownerEmail, name);
    await tenantService.update(tenant.id, { stripeCustomerId: customer.id });
    log.info({ tenantId: tenant.id, customerId: customer.id }, 'Stripe customer created');
  } catch (err: any) {
    log.warn(
      { err: err.message, tenantId: tenant.id },
      'Stripe customer creation failed — tenant created without billing',
    );
  }

  // 3. Create or find owner user and grant tenant_admin role
  try {
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, ownerEmail))
      .limit(1);
    const userId = existingUser?.id || randomUUID();
    ownerUserId = userId;

    if (!existingUser) {
      await db.insert(users).values({
        id: userId,
        email: ownerEmail,
        name: ownerEmail.split('@')[0],
        role: 'tenant_admin',
      });
      log.info({ userId, email: ownerEmail }, 'Owner user created');
    }

    // Grant tenant access
    await db
      .insert(userTenantAccess)
      .values({
        userId,
        tenantId: tenant.id,
        role: 'owner',
      })
      .onConflictDoNothing();

    // Assign tenant_admin role
    const [tenantAdminRole] = await db
      .select()
      .from(roles)
      .where(eq(roles.name, 'tenant_admin'))
      .limit(1);
    if (tenantAdminRole) {
      await db
        .insert(userRoles)
        .values({
          userId,
          roleId: tenantAdminRole.id,
          tenantId: tenant.id,
          grantedAt: new Date(),
        })
        .onConflictDoNothing();
    }

    log.info({ tenantId: tenant.id, userId }, 'Owner assigned to tenant');

    // Notify the new owner that their tenant is provisioned. Failure here is
    // non-fatal — the row is still written locally and shown in the bell.
    try {
      await notificationService.send({
        userId,
        type: 'tenant_created',
        title: `Welcome to ${name}`,
        body: `Your tenant "${name}" is ready. Open the admin to configure billing and integrations.`,
        data: { tenantId: tenant.id, tenantSlug: slug, plan },
        subscriber: { email: ownerEmail, firstName: ownerEmail.split('@')[0] },
      });
    } catch (err: any) {
      log.warn({ err: err.message, userId, tenantId: tenant.id }, 'Welcome notification failed');
    }
  } catch (err: any) {
    if (ownerUserId) {
      await db.delete(userRoles).where(and(eq(userRoles.tenantId, tenant.id), eq(userRoles.userId, ownerUserId)));
      await db.delete(userTenantAccess).where(and(eq(userTenantAccess.tenantId, tenant.id), eq(userTenantAccess.userId, ownerUserId)));
    }
    await db.delete(tenants).where(eq(tenants.id, tenant.id));
    log.error({ err: err.message, tenantId: tenant.id }, 'Owner assignment failed; partial tenant rows compensated');
    throw err;
  }

  return tenant;
}
