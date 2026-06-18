import { Elysia } from 'elysia';
import { stripeService } from '../../modules/billing/stripe.service.js';
import { db } from '../../lib/db.js';
import { invoices, subscriptions, tenants } from '../../db/schema/index.js';
import { eq } from 'drizzle-orm';
import { logger } from '../../lib/logger.js';
import { createRateLimiter } from '../middleware/rateLimiter.js';

const log = logger.child({ module: 'webhooks-stripe' });

export const webhooksStripeRoutes = new Elysia({ prefix: '/api/webhooks' })
  // Rate limit protects against webhook flooding. Tier 'billing' allows
  // 30 requests per minute per IP — generous for legitimate retries,
  // tight enough to defeat bursts.
  .use(createRateLimiter('billing'))
  .post('/stripe', async ({ request, set }) => {
    const signature = request.headers.get('stripe-signature');
    if (!signature) {
      set.status = 400;
      return { error: 'Missing stripe-signature header' };
    }

    try {
      const body = await request.text();
      const event = await stripeService.constructWebhookEvent(body, signature);

      switch (event.type) {
        case 'invoice.paid': {
          const invoice = event.data.object;
          await db
            .update(invoices)
            .set({ status: 'paid' })
            .where(eq(invoices.stripeInvoiceId, invoice.id));
          log.info({ invoiceId: invoice.id }, 'Invoice paid — status updated');
          break;
        }
        case 'invoice.payment_failed': {
          const invoice = event.data.object;
          await db
            .update(invoices)
            .set({ status: 'past_due' })
            .where(eq(invoices.stripeInvoiceId, invoice.id));
          log.warn({ invoiceId: invoice.id }, 'Invoice payment failed — grace period started');
          break;
        }
        case 'customer.subscription.updated': {
          const sub = event.data.object;
          await db
            .update(subscriptions)
            .set({
              status: sub.status,
              plan: sub.metadata?.plan || undefined,
              cancelAtPeriodEnd: sub.cancel_at_period_end,
              currentPeriodStart: sub.current_period_start
                ? new Date(sub.current_period_start * 1000)
                : undefined,
              currentPeriodEnd: sub.current_period_end
                ? new Date(sub.current_period_end * 1000)
                : undefined,
              updatedAt: new Date(),
            })
            .where(eq(subscriptions.stripeSubscriptionId, sub.id));
          log.info({ subscriptionId: sub.id, status: sub.status }, 'Subscription updated');
          break;
        }
        case 'customer.subscription.deleted': {
          const sub = event.data.object;
          await db
            .update(subscriptions)
            .set({ status: 'canceled', updatedAt: new Date() })
            .where(eq(subscriptions.stripeSubscriptionId, sub.id));
          const [dbSub] = await db
            .select()
            .from(subscriptions)
            .where(eq(subscriptions.stripeSubscriptionId, sub.id));
          if (dbSub) {
            await db
              .update(tenants)
              .set({ status: 'suspended', updatedAt: new Date() })
              .where(eq(tenants.id, dbSub.tenantId));
          }
          log.info({ subscriptionId: sub.id }, 'Subscription deleted — tenant suspended');
          break;
        }
        default:
          log.debug({ type: event.type }, 'Unhandled Stripe event');
      }

      return { received: true };
    } catch (err: any) {
      log.error({ err }, 'Webhook verification failed');
      set.status = 400;
      return { error: err.message };
    }
  });
