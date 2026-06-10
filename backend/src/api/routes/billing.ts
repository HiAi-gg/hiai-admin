import { Elysia } from 'elysia';
import { stripeService } from '../../modules/billing/stripe.service.js';
import { authMiddleware } from '../middleware/auth.js';
import { env } from '../../lib/config.js';

const PLANS = [
  { id: 'free', name: 'Free', price: 0, features: ['1 user', '100 products', 'Basic analytics'] },
  {
    id: 'pro',
    name: 'Pro',
    price: 2900,
    features: ['5 users', '10,000 products', 'Advanced analytics', 'Priority support'],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 9900,
    features: ['Unlimited users', 'Unlimited products', 'Custom integrations', 'Dedicated support'],
  },
];

export const billingRoutes = new Elysia({ prefix: '/api/billing' })
  .use(authMiddleware)
  .get('/plans', () => ({ plans: PLANS }))
  .post(
    '/portal',
    async ({ body, set }) => {
      const { customerId, returnUrl } = body as { customerId: string; returnUrl: string };
      try {
        const session = await stripeService.createPortalSession(
          customerId,
          returnUrl || env.BETTER_AUTH_URL,
        );
        return { url: session.url };
      } catch (err: any) {
        set.status = 400;
        return { error: err.message };
      }
    },
    { requireSuperAdmin: true },
  );
