import Stripe from 'stripe';
import { env } from '../../lib/config.js';
import { AppError, ErrorCode } from '../../lib/errors.js';
import { logger } from '../../lib/logger.js';

const _log = logger.child({ module: 'stripe' });

/**
 * Stripe is optional at startup: the API can boot without billing configured
 * (e.g. local dev, OSS deployments without subscriptions). Each billing
 * method throws a 503 AppError when STRIPE_SECRET_KEY is missing so the
 * UI gets a clear "billing disabled" signal instead of a generic 500.
 *
 * STRIPE_WEBHOOK_SECRET is only required for constructWebhookEvent() and
 * is checked there — only the webhook-verification path needs it.
 */
let _stripe: Stripe | null = null;
function getStripe(): Stripe {
  if (_stripe) return _stripe;
  if (!env.STRIPE_SECRET_KEY) {
    throw new AppError({
      status: 503,
      code: ErrorCode.UPSTREAM_ERROR,
      message: 'Billing is not configured (STRIPE_SECRET_KEY missing)',
    });
  }
  _stripe = new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' });
  return _stripe;
}

/** True iff STRIPE_SECRET_KEY is set. Webhook secret is checked separately. */
export function isStripeConfigured(): boolean {
  return Boolean(env.STRIPE_SECRET_KEY);
}

export const stripeService = {
  async createCustomer(email: string, name: string) {
    return getStripe().customers.create({ email, name });
  },

  async createSubscription(customerId: string, priceId: string) {
    return getStripe().subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      expand: ['latest_invoice.payment_intent'],
    });
  },

  async updateSubscription(subId: string, items: { price: string }[]) {
    return getStripe().subscriptions.update(subId, { items });
  },

  async cancelSubscription(subId: string, atPeriodEnd = true) {
    return getStripe().subscriptions.update(subId, { cancel_at_period_end: atPeriodEnd });
  },

  async reactivateSubscription(subId: string) {
    return getStripe().subscriptions.update(subId, { cancel_at_period_end: false });
  },

  async createPortalSession(customerId: string, returnUrl: string) {
    return getStripe().billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });
  },

  async listInvoices(customerId: string, limit = 20) {
    return getStripe().invoices.list({ customer: customerId, limit });
  },

  async constructWebhookEvent(body: string | Buffer, signature: string) {
    if (!env.STRIPE_WEBHOOK_SECRET) {
      throw new AppError({
        status: 503,
        code: ErrorCode.UPSTREAM_ERROR,
        message: 'Stripe webhook verification is not configured (STRIPE_WEBHOOK_SECRET missing)',
      });
    }
    return getStripe().webhooks.constructEvent(body, signature, env.STRIPE_WEBHOOK_SECRET);
  },
};
