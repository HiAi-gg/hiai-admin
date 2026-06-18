import { Elysia, t } from 'elysia';
import { stripeService } from '../../modules/billing/stripe.service.js';
import { authMiddleware } from '../middleware/auth.js';
import { env } from '../../lib/config.js';
import { webhookPortalSchema } from '../validation/integration.schema.js';

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
      const parsed = webhookPortalSchema.safeParse(body);
      if (!parsed.success) {
        set.status = 400;
        return { error: 'Validation failed', details: parsed.error.flatten() };
      }
      const { customerId, returnUrl } = parsed.data;
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
    {
      requireSuperAdmin: true,
      body: t.Object({
        customerId: t.String(),
        returnUrl: t.Optional(t.String({ format: 'uri' })),
      }),
    },
  );
