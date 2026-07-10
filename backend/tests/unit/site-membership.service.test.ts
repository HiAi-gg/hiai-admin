import { beforeEach, describe, expect, it, vi } from 'vitest';

function chain<T>(terminal: T) {
  const value = {
    select: vi.fn(() => value),
    from: vi.fn(() => value),
    innerJoin: vi.fn(() => value),
    where: vi.fn(() => value),
    limit: vi.fn(async () => terminal),
  };
  return value;
}

const dbMock = { select: vi.fn() };
vi.mock('../../src/lib/db.js', () => ({ db: dbMock }));

const { siteMembershipService } = await import(
  '../../src/modules/site-membership/site-membership.service.js'
);

describe('siteMembershipService', () => {
  beforeEach(() => vi.clearAllMocks());

  it('bridges the authenticated session to users by email and requires an enabled adapter membership', async () => {
    dbMock.select
      .mockReturnValueOnce(chain([{ id: 'platform-user-1' }]))
      .mockReturnValueOnce(
        chain([
          {
            id: 'membership-1',
            userId: 'platform-user-1',
            siteAdapterId: 'adapter-1',
            globalRole: 'viewer',
            role: 'admin',
            permissions: ['articles:read'],
            adapterSlug: 'test',
            tenantId: 'tenant-1',
          },
        ]),
      );

    await expect(
      siteMembershipService.getActiveMembership(
        { id: 'better-auth-id', email: 'siteadmin@hiai.local', role: 'admin' },
        'test',
      ),
    ).resolves.toMatchObject({ adapterSlug: 'test', role: 'admin' });
    expect(dbMock.select).toHaveBeenCalledTimes(2);
  });
});
