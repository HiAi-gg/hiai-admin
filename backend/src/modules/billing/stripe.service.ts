import Stripe from 'stripe';
import { env } from '../../lib/config.js';
import { logger } from '../../lib/logger.js';

const _log = logger.child({ module: 'stripe' });

if (!env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY is required');
const stripe = new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' });

export const stripeService = {
  async createCustomer(email: string, name: string) {
    return stripe.customers.create({ email, name });
  },

  async createSubscription(customerId: string, priceId: string) {
    return stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      expand: ['latest_invoice.payment_intent'],
    });
  },

  async updateSubscription(subId: string, items: { price: string }[]) {
    return stripe.subscriptions.update(subId, { items });
  },

  async cancelSubscription(subId: string, atPeriodEnd = true) {
    return stripe.subscriptions.update(subId, { cancel_at_period_end: atPeriodEnd });
  },

  async reactivateSubscription(subId: string) {
    return stripe.subscriptions.update(subId, { cancel_at_period_end: false });
  },

  async createPortalSession(customerId: string, returnUrl: string) {
    return stripe.billingPortal.sessions.create({ customer: customerId, return_url: returnUrl });
  },

  async listInvoices(customerId: string, limit = 20) {
    return stripe.invoices.list({ customer: customerId, limit });
  },

  async constructWebhookEvent(body: string | Buffer, signature: string) {
    const secret = env.STRIPE_WEBHOOK_SECRET || '';
    return stripe.webhooks.constructEvent(body, signature, secret);
  },
};
