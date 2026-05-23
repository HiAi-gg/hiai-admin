import { Elysia } from 'elysia';
import { stripeService } from '../../modules/billing/stripe.service.js';
import { createChildLogger } from '../../lib/logger.js';

const log = createChildLogger('webhooks-stripe');

export const webhooksStripeRoutes = new Elysia({ prefix: '/api/webhooks' })
  .post('/stripe', async ({ request, set }) => {
    const signature = request.headers.get('stripe-signature');
    if (!signature) { set.status = 400; return { error: 'Missing stripe-signature header' }; }

    try {
      const body = await request.text();
      const event = await stripeService.constructWebhookEvent(body, signature);

      switch (event.type) {
        case 'invoice.paid':
          log.info({ invoiceId: event.data.object.id }, 'Invoice paid');
          break;
        case 'invoice.payment_failed':
          log.warn({ invoiceId: event.data.object.id }, 'Invoice payment failed');
          break;
        case 'customer.subscription.updated':
          log.info({ subscriptionId: event.data.object.id }, 'Subscription updated');
          break;
        case 'customer.subscription.deleted':
          log.info({ subscriptionId: event.data.object.id }, 'Subscription deleted');
          break;
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
