import { describe, it, expect, vi } from 'vitest';

vi.hoisted(() => {
  process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
  process.env.REDIS_URL = 'redis://localhost:6379';
  process.env.BETTER_AUTH_SECRET = 'test-shared-secret-min-32-characters-long-x';
  process.env.BETTER_AUTH_URL = 'http://localhost:50200';
});

import {
  PLAN_FEATURES,
  getPlanFeatures,
  getPlanPrice,
  getAllPlans,
  type PlanId,
} from '../../src/modules/billing/plan.service.js';

describe('Billing Plan Service', () => {
  describe('PLAN_FEATURES catalog', () => {
    it('defines exactly the three plans (free, pro, enterprise)', () => {
      expect(Object.keys(PLAN_FEATURES).sort()).toEqual(['enterprise', 'free', 'pro']);
    });

    it('defines Free at $0/mo with the smallest quotas', () => {
      expect(PLAN_FEATURES.free.id).toBe('free');
      expect(PLAN_FEATURES.free.priceCents).toBe(0);
      expect(PLAN_FEATURES.free.priceLabel).toBe('$0/mo');
      expect(PLAN_FEATURES.free.maxUsers).toBe(1);
      expect(PLAN_FEATURES.free.maxProducts).toBe(100);
      expect(PLAN_FEATURES.free.maxStorage).toBe(1);
    });

    it('defines Pro at $29/mo with mid-tier quotas', () => {
      expect(PLAN_FEATURES.pro.id).toBe('pro');
      expect(PLAN_FEATURES.pro.priceCents).toBe(2900);
      expect(PLAN_FEATURES.pro.priceLabel).toBe('$29/mo');
      expect(PLAN_FEATURES.pro.maxUsers).toBe(5);
      expect(PLAN_FEATURES.pro.maxProducts).toBe(10_000);
      expect(PLAN_FEATURES.pro.maxStorage).toBe(50);
    });

    it('defines Enterprise at $99/mo with -1 (unlimited) caps', () => {
      expect(PLAN_FEATURES.enterprise.id).toBe('enterprise');
      expect(PLAN_FEATURES.enterprise.priceCents).toBe(9900);
      expect(PLAN_FEATURES.enterprise.priceLabel).toBe('$99/mo');
      expect(PLAN_FEATURES.enterprise.maxUsers).toBe(-1);
      expect(PLAN_FEATURES.enterprise.maxProducts).toBe(-1);
      expect(PLAN_FEATURES.enterprise.maxStorage).toBe(-1);
    });

    it('progressively expands features with tier', () => {
      expect(PLAN_FEATURES.free.features.length).toBeLessThan(PLAN_FEATURES.pro.features.length);
      expect(PLAN_FEATURES.pro.features.length).toBeLessThanOrEqual(
        PLAN_FEATURES.enterprise.features.length,
      );
    });

    it('only mid+ plans include API access', () => {
      expect(PLAN_FEATURES.free.features).not.toContain('API access');
      expect(PLAN_FEATURES.pro.features).toContain('API access');
      expect(PLAN_FEATURES.enterprise.features).toContain('API access');
    });

    it('only enterprise includes SSO and SLA', () => {
      expect(PLAN_FEATURES.enterprise.features).toContain('SSO');
      expect(PLAN_FEATURES.enterprise.features).toContain('SLA');
      expect(PLAN_FEATURES.free.features).not.toContain('SSO');
      expect(PLAN_FEATURES.pro.features).not.toContain('SSO');
    });
  });

  describe('getPlanFeatures', () => {
    it.each<PlanId>(['free', 'pro', 'enterprise'])('returns features for "%s" plan', (plan) => {
      const features = getPlanFeatures(plan);
      expect(features.id).toBe(plan);
      expect(features.features.length).toBeGreaterThan(0);
      expect(features.priceCents).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getPlanPrice', () => {
    it('returns 0 for free', () => expect(getPlanPrice('free')).toBe(0));
    it('returns 2900 for pro', () => expect(getPlanPrice('pro')).toBe(2900));
    it('returns 9900 for enterprise', () => expect(getPlanPrice('enterprise')).toBe(9900));
  });

  describe('getAllPlans', () => {
    it('returns 3 plans', () => {
      const plans = getAllPlans();
      expect(plans).toHaveLength(3);
    });

    it('returns plans sorted by ascending price', () => {
      const plans = getAllPlans();
      const sorted = [...plans].sort((a, b) => a.priceCents - b.priceCents);
      expect(plans.map((p) => p.id)).toEqual(sorted.map((p) => p.id));
      expect(plans[0]?.id).toBe('free');
      expect(plans[2]?.id).toBe('enterprise');
    });

    it('every plan has a unique id', () => {
      const ids = getAllPlans().map((p) => p.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });
});
