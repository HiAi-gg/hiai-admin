import type Stripe from 'stripe';
import { db } from '../../lib/db.js';
import { subscriptions, tenants } from '../../db/schema/index.js';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { stripeService } from './stripe.service.js';
import { PLAN_FEATURES, type PlanId } from './plan.service.js';

export async function subscribe(tenantId: string, plan: PlanId) {
  const tenant = await db.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1);
  if (!tenant[0]) throw new Error('Tenant not found');
  if (plan === 'free') {
    const subId = randomUUID();
    await db.insert(subscriptions).values({
      id: subId,
      tenantId,
      plan,
      status: 'active',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 365 * 86400000),
    });
    await db
      .update(tenants)
      .set({ plan, status: 'active', updatedAt: new Date() })
      .where(eq(tenants.id, tenantId));
    return { subscriptionId: subId };
  }

  const priceId = PLAN_FEATURES[plan].stripePriceId;
  if (!priceId) throw new Error('No Stripe price configured for plan');

  let customerId = tenant[0].stripeCustomerId;
  if (!customerId) {
    const customer = await stripeService.createCustomer(tenant[0].email ?? '', tenant[0].name);
    customerId = customer.id;
    await db
      .update(tenants)
      .set({ stripeCustomerId: customerId, updatedAt: new Date() })
      .where(eq(tenants.id, tenantId));
  }

  const stripeSub = await stripeService.createSubscription(customerId, priceId);
  const subId = randomUUID();
  await db.insert(subscriptions).values({
    id: subId,
    tenantId,
    plan,
    status: 'active',
    stripeSubscriptionId: stripeSub.id,
    currentPeriodStart: new Date(stripeSub.current_period_start * 1000),
    currentPeriodEnd: new Date(stripeSub.current_period_end * 1000),
  });
  await db
    .update(tenants)
    .set({ plan, status: 'active', updatedAt: new Date() })
    .where(eq(tenants.id, tenantId));

  const invoice = stripeSub.latest_invoice as Stripe.Invoice | null;
  return {
    subscriptionId: subId,
    stripeSubscriptionId: stripeSub.id,
    clientSecret: (invoice?.payment_intent as Stripe.PaymentIntent)?.client_secret,
  };
}

export async function upgrade(tenantId: string, newPlan: PlanId) {
  const current = await getCurrent(tenantId);
  if (!current?.stripeSubscriptionId) throw new Error('No active Stripe subscription');
  const priceId = PLAN_FEATURES[newPlan].stripePriceId;
  if (!priceId) throw new Error('No Stripe price for plan');
  await stripeService.updateSubscription(current.stripeSubscriptionId, [{ price: priceId }]);
  await db
    .update(subscriptions)
    .set({ plan: newPlan, updatedAt: new Date() })
    .where(eq(subscriptions.id, current.id));
  await db
    .update(tenants)
    .set({ plan: newPlan, updatedAt: new Date() })
    .where(eq(tenants.id, tenantId));
}

export async function downgrade(tenantId: string, newPlan: PlanId) {
  await upgrade(tenantId, newPlan);
}

export async function cancel(tenantId: string) {
  const current = await getCurrent(tenantId);
  if (!current?.stripeSubscriptionId) throw new Error('No active subscription');
  await stripeService.cancelSubscription(current.stripeSubscriptionId, true);
  await db
    .update(subscriptions)
    .set({ cancelAtPeriodEnd: true, updatedAt: new Date() })
    .where(eq(subscriptions.id, current.id));
}

export async function reactivate(tenantId: string) {
  const current = await getCurrent(tenantId);
  if (!current?.stripeSubscriptionId) throw new Error('No subscription');
  await stripeService.reactivateSubscription(current.stripeSubscriptionId);
  await db
    .update(subscriptions)
    .set({ cancelAtPeriodEnd: false, updatedAt: new Date() })
    .where(eq(subscriptions.id, current.id));
}

export async function getCurrent(tenantId: string) {
  const rows = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.tenantId, tenantId))
    .limit(1);
  return rows[0] ?? null;
}
