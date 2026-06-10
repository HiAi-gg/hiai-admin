import { describe, it, expect } from 'vitest';
import {
  paginationSchema,
  idParamSchema,
  textIdParamSchema,
  searchSchema,
} from '../../src/api/validation/schemas.js';
import {
  createTenantSchema,
  updateTenantSchema,
  changePlanSchema,
} from '../../src/api/validation/tenant.schema.js';
import {
  createUserSchema,
  updateUserSchema,
  assignRoleSchema,
} from '../../src/api/validation/user.schema.js';
import {
  subscribeSchema,
  upgradeSchema,
  downgradeSchema,
} from '../../src/api/validation/billing.schema.js';

describe('validation schemas', () => {
  describe('paginationSchema', () => {
    it('applies defaults when no values provided', () => {
      const result = paginationSchema.parse({});
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.sortOrder).toBe('desc');
    });

    it('coerces string numbers from query params', () => {
      const result = paginationSchema.parse({ page: '3', limit: '50' });
      expect(result.page).toBe(3);
      expect(result.limit).toBe(50);
    });

    it('rejects page < 1', () => {
      expect(() => paginationSchema.parse({ page: 0 })).toThrow();
    });

    it('rejects limit > 100', () => {
      expect(() => paginationSchema.parse({ limit: 200 })).toThrow();
    });

    it('accepts valid sortOrder values', () => {
      expect(paginationSchema.parse({ sortOrder: 'asc' }).sortOrder).toBe('asc');
      expect(paginationSchema.parse({ sortOrder: 'desc' }).sortOrder).toBe('desc');
    });

    it('rejects invalid sortOrder', () => {
      expect(() => paginationSchema.parse({ sortOrder: 'sideways' })).toThrow();
    });
  });

  describe('idParamSchema', () => {
    it('accepts a valid uuid', () => {
      const id = '00000000-0000-4000-8000-000000000000';
      expect(idParamSchema.parse({ id }).id).toBe(id);
    });

    it('rejects non-uuid strings', () => {
      expect(() => idParamSchema.parse({ id: 'not-a-uuid' })).toThrow();
    });
  });

  describe('textIdParamSchema', () => {
    it('accepts any non-empty string id', () => {
      expect(textIdParamSchema.parse({ id: 'tenant-123' }).id).toBe('tenant-123');
      expect(textIdParamSchema.parse({ id: 'abc' }).id).toBe('abc');
    });

    it('rejects empty string', () => {
      expect(() => textIdParamSchema.parse({ id: '' })).toThrow();
    });
  });

  describe('searchSchema', () => {
    it('accepts omitted q and status', () => {
      const result = searchSchema.parse({});
      expect(result.q).toBeUndefined();
      expect(result.status).toBeUndefined();
    });

    it('rejects q over 200 chars', () => {
      expect(() => searchSchema.parse({ q: 'x'.repeat(201) })).toThrow();
    });
  });

  describe('createTenantSchema', () => {
    it('accepts minimal valid tenant (name + slug only)', () => {
      const result = createTenantSchema.parse({ name: 'Acme', slug: 'acme' });
      expect(result.name).toBe('Acme');
      expect(result.slug).toBe('acme');
    });

    it('rejects empty name', () => {
      expect(() => createTenantSchema.parse({ name: '', slug: 'acme' })).toThrow();
    });

    it('rejects slug with uppercase letters', () => {
      expect(() => createTenantSchema.parse({ name: 'Acme', slug: 'Acme' })).toThrow();
    });

    it('rejects slug with underscores', () => {
      expect(() => createTenantSchema.parse({ name: 'Acme', slug: 'a_b' })).toThrow();
    });

    it('accepts slug with hyphens and digits', () => {
      expect(() => createTenantSchema.parse({ name: 'X', slug: 'store-42' })).not.toThrow();
    });

    it('rejects invalid email', () => {
      expect(() =>
        createTenantSchema.parse({ name: 'X', slug: 'x', email: 'not-email' }),
      ).toThrow();
    });

    it('rejects unsupported plan', () => {
      expect(() => createTenantSchema.parse({ name: 'X', slug: 'x', plan: 'platinum' })).toThrow();
    });

    it.each([
      ['free', true],
      ['pro', true],
      ['enterprise', true],
      ['starter', false],
    ] as const)('plan=%s valid=%s', (plan, valid) => {
      const check = () => createTenantSchema.parse({ name: 'X', slug: 'x', plan });
      if (valid) expect(check).not.toThrow();
      else expect(check).toThrow();
    });
  });

  describe('updateTenantSchema', () => {
    it('accepts empty object (all fields optional)', () => {
      expect(() => updateTenantSchema.parse({})).not.toThrow();
    });

    it('accepts a single field update', () => {
      const result = updateTenantSchema.parse({ name: 'New Name' });
      expect(result.name).toBe('New Name');
    });
  });

  describe('changePlanSchema', () => {
    it('accepts each valid plan', () => {
      expect(changePlanSchema.parse({ plan: 'free' }).plan).toBe('free');
      expect(changePlanSchema.parse({ plan: 'pro' }).plan).toBe('pro');
      expect(changePlanSchema.parse({ plan: 'enterprise' }).plan).toBe('enterprise');
    });

    it('rejects unknown plan', () => {
      expect(() => changePlanSchema.parse({ plan: 'platinum' })).toThrow();
    });
  });

  describe('user schemas', () => {
    it('createUserSchema requires email', () => {
      expect(() => createUserSchema.parse({ id: 'u1', name: 'X' })).toThrow();
    });

    it('createUserSchema rejects invalid email', () => {
      expect(() => createUserSchema.parse({ id: 'u1', email: 'bad', name: 'X' })).toThrow();
    });

    it('createUserSchema accepts valid input', () => {
      const result = createUserSchema.parse({ id: 'u1', email: 'alice@example.com', name: 'X' });
      expect(result.email).toBe('alice@example.com');
    });

    it('updateUserSchema accepts empty object', () => {
      expect(() => updateUserSchema.parse({})).not.toThrow();
    });

    it('assignRoleSchema requires roleId', () => {
      expect(() => assignRoleSchema.parse({})).toThrow();
    });

    it('assignRoleSchema rejects non-uuid tenantId', () => {
      expect(() => assignRoleSchema.parse({ roleId: 'r1', tenantId: 'not-uuid' })).toThrow();
    });
  });

  describe('billing schemas', () => {
    it('subscribeSchema rejects unknown plan', () => {
      expect(() =>
        subscribeSchema.parse({
          tenantId: '00000000-0000-4000-8000-000000000000',
          plan: 'platinum',
        }),
      ).toThrow();
    });

    it('upgradeSchema forbids downgrade to free', () => {
      expect(() =>
        upgradeSchema.parse({ tenantId: '00000000-0000-4000-8000-000000000000', plan: 'free' }),
      ).toThrow();
    });

    it('downgradeSchema forbids upgrade to enterprise', () => {
      expect(() =>
        downgradeSchema.parse({
          tenantId: '00000000-0000-4000-8000-000000000000',
          plan: 'enterprise',
        }),
      ).toThrow();
    });
  });
});
