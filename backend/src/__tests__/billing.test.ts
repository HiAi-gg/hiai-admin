import { describe, it, expect } from 'bun:test';
import {
  PLAN_FEATURES,
  getPlanFeatures,
  getPlanPrice,
  getAllPlans,
} from '../modules/billing/plan.service.js';

describe('Billing Plan Service', () => {
  describe('Plan Definitions', () => {
    it('should define Free plan at $0/mo', () => {
      expect(PLAN_FEATURES.free.priceCents).toBe(0);
      expect(PLAN_FEATURES.free.maxUsers).toBe(1);
      expect(PLAN_FEATURES.free.maxProducts).toBe(100);
      expect(PLAN_FEATURES.free.priceLabel).toBe('$0/mo');
    });

    it('should define Pro plan at $29/mo', () => {
      expect(PLAN_FEATURES.pro.priceCents).toBe(2900);
      expect(PLAN_FEATURES.pro.maxUsers).toBe(5);
      expect(PLAN_FEATURES.pro.maxProducts).toBe(10000);
      expect(PLAN_FEATURES.pro.priceLabel).toBe('$29/mo');
    });

    it('should define Enterprise plan at $99/mo', () => {
      expect(PLAN_FEATURES.enterprise.priceCents).toBe(9900);
      expect(PLAN_FEATURES.enterprise.maxUsers).toBe(-1); // unlimited
      expect(PLAN_FEATURES.enterprise.maxProducts).toBe(-1);
      expect(PLAN_FEATURES.enterprise.priceLabel).toBe('$99/mo');
    });
  });

  describe('getPlanFeatures', () => {
    it('should return features for free plan', () => {
      const features = getPlanFeatures('free');
      expect(features.id).toBe('free');
      expect(features.features.length).toBeGreaterThan(0);
    });

    it('should return features for pro plan', () => {
      const features = getPlanFeatures('pro');
      expect(features.id).toBe('pro');
      expect(features.features).toContain('API access');
    });

    it('should return features for enterprise plan', () => {
      const features = getPlanFeatures('enterprise');
      expect(features.id).toBe('enterprise');
      expect(features.features).toContain('SSO');
      expect(features.features).toContain('SLA');
    });
  });

  describe('getPlanPrice', () => {
    it('should return 0 for free plan', () => {
      expect(getPlanPrice('free')).toBe(0);
    });

    it('should return 2900 cents for pro plan', () => {
      expect(getPlanPrice('pro')).toBe(2900);
    });

    it('should return 9900 cents for enterprise plan', () => {
      expect(getPlanPrice('enterprise')).toBe(9900);
    });
  });

  describe('getAllPlans', () => {
    it('should return all 3 plans', () => {
      const plans = getAllPlans();
      expect(plans.length).toBe(3);
      expect(plans.map((p) => p.id).sort()).toEqual(['enterprise', 'free', 'pro']);
    });

    it('should have increasing feature limits across plans', () => {
      const plans = getAllPlans();
      const free = plans.find((p) => p.id === 'free')!;
      const pro = plans.find((p) => p.id === 'pro')!;
      const enterprise = plans.find((p) => p.id === 'enterprise')!;

      // Free < Pro < Enterprise (where -1 means unlimited)
      expect(free.maxUsers).toBeLessThan(pro.maxUsers);
      expect(enterprise.maxUsers).toBe(-1); // unlimited
      expect(free.maxProducts).toBeLessThan(pro.maxProducts);
      expect(enterprise.maxProducts).toBe(-1); // unlimited
    });

    it('should have increasing prices', () => {
      const plans = getAllPlans();
      const sorted = [...plans].sort((a, b) => a.priceCents - b.priceCents);
      expect(sorted[0].id).toBe('free');
      expect(sorted[1].id).toBe('pro');
      expect(sorted[2].id).toBe('enterprise');
    });
  });
});
