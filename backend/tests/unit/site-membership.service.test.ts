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

function writeChain<T>(terminal: T) {
  const value = {
    values: vi.fn(() => value),
    onConflictDoUpdate: vi.fn(() => value),
    where: vi.fn(() => value),
    returning: vi.fn(async () => terminal),
  };
  return value;
}

const dbMock = { select: vi.fn(), insert: vi.fn(), delete: vi.fn() };
vi.mock('../../src/lib/db.js', () => ({ db: dbMock }));

const { siteMembershipService } = await import(
  '../../src/modules/site-membership/site-membership.service.js'
);

describe('siteMembershipService', () => {
  beforeEach(() => vi.clearAllMocks());

  it('bridges the authenticated session to users by email and requires an enabled adapter membership', async () => {
    dbMock.select.mockReturnValueOnce(chain([{ id: 'platform-user-1' }])).mockReturnValueOnce(
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

  it('assigns or updates one membership per user and adapter', async () => {
    const write = writeChain([
      {
        id: 'membership-1',
        userId: 'platform-user-1',
        siteAdapterId: 'adapter-1',
        role: 'admin',
        globalRole: 'viewer',
        permissions: ['articles:write'],
      },
    ]);
    dbMock.select.mockReturnValueOnce(chain([{ id: 'adapter-1' }]));
    dbMock.insert.mockReturnValueOnce(write);

    await expect(
      siteMembershipService.assign('test', {
        userId: 'platform-user-1',
        role: 'admin',
        globalRole: 'viewer',
        permissions: ['articles:write'],
      }),
    ).resolves.toMatchObject({ id: 'membership-1', role: 'admin' });
    expect(write.onConflictDoUpdate).toHaveBeenCalledOnce();
  });

  it('revokes membership only for the resolved adapter and user', async () => {
    const write = writeChain([{ id: 'membership-1' }]);
    dbMock.select.mockReturnValueOnce(chain([{ id: 'adapter-1' }]));
    dbMock.delete.mockReturnValueOnce(write);

    await expect(siteMembershipService.remove('test', 'platform-user-1')).resolves.toBe(true);
    expect(write.where).toHaveBeenCalledOnce();
  });
});
