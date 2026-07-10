import { beforeEach, describe, expect, it, vi } from 'vitest';

const membershipLookup = vi.fn();
const { siteMembershipService } = await import(
  '../../src/modules/site-membership/site-membership.service.js'
);
const { authorizeSiteAdmin, siteAccessMiddleware } = await import(
  '../../src/api/middleware/site-access.js'
);
const { Elysia } = await import('elysia');
vi.spyOn(siteMembershipService, 'getActiveMembership').mockImplementation(membershipLookup);

describe('site membership authorization', () => {
  beforeEach(() => vi.clearAllMocks());

  it('does not require the schema-ready global_admin role', async () => {
    membershipLookup.mockResolvedValueOnce({ role: 'member', globalRole: 'viewer' });
    await expect(
      authorizeSiteAdmin({ id: 'u1', email: 'u@test.local', role: 'admin' }, 'test'),
    ).resolves.toMatchObject({
      status: 200,
    });
  });

  it('denies a member of another adapter', async () => {
    membershipLookup.mockResolvedValueOnce(null);
    await expect(
      authorizeSiteAdmin({ id: 'u1', email: 'u@test.local', role: 'admin' }, 'test'),
    ).resolves.toEqual({
      status: 403,
      membership: null,
    });
  });

  it('protects the access route for site admins only', async () => {
    membershipLookup.mockResolvedValueOnce({ role: 'admin', permissions: [] });
    const app = new Elysia()
      .derive(() => ({ user: { id: 'u1', email: 'u@test.local', role: 'admin' } }))
      .use(siteAccessMiddleware)
      .get('/:adapterSlug', ({ params }: any) => ({ adapterSlug: params.adapterSlug }), {
        requireSiteAdmin: true,
      });

    const response = await app.handle(new Request('http://localhost/test'));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ adapterSlug: 'test' });
    expect(membershipLookup).toHaveBeenCalledWith(
      { id: 'u1', email: 'u@test.local', role: 'admin' },
      'test',
    );
  });
});
