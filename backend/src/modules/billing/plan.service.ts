import { env } from '../../lib/config.js';

export type PlanId = 'free' | 'pro' | 'enterprise';

export interface PlanFeatures {
  id: PlanId;
  name: string;
  priceCents: number;
  priceLabel: string;
  maxUsers: number;
  maxProducts: number;
  maxStorage: number;
  features: string[];
  stripePriceId?: string;
}

export const PLAN_FEATURES: Record<PlanId, PlanFeatures> = {
  free: {
    id: 'free',
    name: 'Free',
    priceCents: 0,
    priceLabel: '$0/mo',
    maxUsers: 1,
    maxProducts: 100,
    maxStorage: 1,
    features: ['1 user', '100 products', '1 GB storage', 'Basic analytics', 'Email support'],
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    priceCents: 2900,
    priceLabel: '$29/mo',
    maxUsers: 5,
    maxProducts: 10000,
    maxStorage: 50,
    features: [
      '5 users',
      '10,000 products',
      '50 GB storage',
      'Advanced analytics',
      'Priority support',
      'Custom domain',
      'API access',
    ],
    stripePriceId: env.STRIPE_PRO_PRICE_ID,
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    priceCents: 9900,
    priceLabel: '$99/mo',
    maxUsers: -1,
    maxProducts: -1,
    maxStorage: -1,
    features: [
      'Unlimited users',
      'Unlimited products',
      'Unlimited storage',
      'Full analytics',
      'Dedicated support',
      'Custom domain',
      'API access',
      'SSO',
      'SLA',
    ],
    stripePriceId: env.STRIPE_ENTERPRISE_PRICE_ID,
  },
};

export function getPlanFeatures(plan: PlanId): PlanFeatures {
  return PLAN_FEATURES[plan];
}

export function getPlanPrice(plan: PlanId): number {
  return PLAN_FEATURES[plan].priceCents;
}

export function getAllPlans(): PlanFeatures[] {
  return Object.values(PLAN_FEATURES);
}
