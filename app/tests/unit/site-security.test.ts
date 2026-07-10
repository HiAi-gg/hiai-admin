import { beforeEach, describe, expect, it, vi } from 'vitest';
import { siteMembershipService } from '../../../backend/src/modules/site-membership/site-membership.service.js';
import { auditService } from '../../../backend/src/modules/audit/audit.service.js';
import { canAccessSiteAdapter, filterAccessibleSiteAdapters } from '$lib/server/site-access.js';
import { recordSiteMutationAudit, SiteAuditError } from '$lib/server/site-audit.js';

vi.mock('../../../backend/src/modules/site-membership/site-membership.service.js', () => ({
  siteMembershipService: { getActiveMembership: vi.fn() },
}));
vi.mock('../../../backend/src/modules/audit/audit.service.js', () => ({
  auditService: { record: vi.fn() },
}));

const membershipLookup = siteMembershipService.getActiveMembership as unknown as ReturnType<
  typeof vi.fn
>;
const auditRecord = auditService.record as unknown as ReturnType<typeof vi.fn>;

describe('site authorization and mutation audit', () => {
  beforeEach(() => vi.clearAllMocks());

  it('requires membership for the exact adapter and filters inaccessible sites', async () => {
    membershipLookup.mockImplementation(async (_user: unknown, slug: string) =>
      slug === 'site-a' ? { id: 'membership-a' } : null,
    );
    const user = { id: 'session-user', email: 'admin@example.test', role: 'admin' };

    await expect(canAccessSiteAdapter({ slug: 'site-a', enabled: true }, user)).resolves.toBe(true);
    await expect(canAccessSiteAdapter({ slug: 'site-b', enabled: true }, user)).resolves.toBe(
      false,
    );
    await expect(
      filterAccessibleSiteAdapters(
        [
          { slug: 'site-a', enabled: true },
          { slug: 'site-b', enabled: true },
          { slug: 'site-disabled', enabled: false },
        ],
        user,
      ),
    ).resolves.toEqual([{ slug: 'site-a', enabled: true }]);
  });

  it('allows super_admin without a membership lookup and denies missing users', async () => {
    await expect(
      canAccessSiteAdapter(
        { slug: 'site-a', enabled: true },
        { id: 'super', email: 'super@example.test', role: 'super_admin' },
      ),
    ).resolves.toBe(true);
    await expect(canAccessSiteAdapter({ slug: 'site-a', enabled: true }, null)).resolves.toBe(
      false,
    );
    expect(membershipLookup).not.toHaveBeenCalled();
  });

  it('fails closed when membership lookup fails', async () => {
    membershipLookup.mockRejectedValueOnce(new Error('database unavailable'));
    await expect(
      canAccessSiteAdapter(
        { slug: 'site-a', enabled: true },
        { id: 'user', email: 'user@example.test', role: 'admin' },
      ),
    ).rejects.toThrow('database unavailable');
  });

  it('records actor, site, request metadata and mutation phase', async () => {
    auditRecord.mockResolvedValueOnce({ id: 'audit-1' });
    const request = new Request('http://admin.test/sites/site-a/articles', {
      method: 'POST',
      headers: {
        'x-forwarded-for': '203.0.113.10, 10.0.0.1',
        'user-agent': 'vitest',
      },
    });

    await recordSiteMutationAudit({
      user: { id: 'user-1', email: 'user@example.test' },
      request,
      siteSlug: 'site-a',
      action: 'site-article:create',
      resource: 'site-article',
      resourceId: 'article-1',
      phase: 'success',
      details: { status: 'draft' },
    });

    expect(auditRecord).toHaveBeenCalledWith({
      actorId: 'user-1',
      actorEmail: 'user@example.test',
      action: 'site-article:create:success',
      resource: 'site-article',
      resourceId: 'article-1',
      newValue: { siteSlug: 'site-a', phase: 'success', status: 'draft' },
      ipAddress: '203.0.113.10',
      userAgent: 'vitest',
    });
  });

  it('prevents mutation startup when the attempt audit cannot be recorded', async () => {
    auditRecord.mockRejectedValueOnce(new Error('audit database unavailable'));
    await expect(
      recordSiteMutationAudit({
        user: { id: 'user-1', email: 'user@example.test' },
        request: new Request('http://admin.test/sites/site-a'),
        siteSlug: 'site-a',
        action: 'site-settings:update',
        resource: 'site-settings',
        phase: 'attempt',
      }),
    ).rejects.toEqual(expect.any(SiteAuditError));
  });
});
