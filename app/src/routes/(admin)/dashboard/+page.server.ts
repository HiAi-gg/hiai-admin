import { redirect } from '@sveltejs/kit';
import { api } from '$lib/api.js';
import { siteAdapterService } from '../../../../../backend/src/modules/site-adapter/site-adapter.service.js';
import { filterAccessibleSiteAdapters } from '$lib/server/site-access.js';

export async function load({ locals }) {
  // Dashboard is a platform-wide analytics surface (MRR, churn, tenant growth,
  // live activity). It depends on `/api/analytics/*` endpoints that aggregate
  // data across ALL tenants and is only meaningful for `super_admin`. A site
  // admin (admin/editor) has no platform-level metrics to view here — they
  // belong inside their own site's adapter.
  //
  // Hard guard (server load, runs before any data fetch):
  //   - super_admin           → load full dashboard
  //   - site admin / unscoped → redirect to /sites (or to their first
  //                              accessible site if one exists)
  //   - no user               → layout already redirects to /login
  const role = locals.user?.role ?? '';
  if (role !== 'super_admin') {
    let target = '/sites';
    try {
      const [first] = await filterAccessibleSiteAdapters(
        await siteAdapterService.list(),
        locals.user,
      );
      if (first?.slug) {
        target = `/sites/${first.slug}`;
      }
    } catch {
      // Fall back to /sites — never block on adapter lookup errors.
    }
    throw redirect(302, target);
  }

  try {
    const [overview, tenants, mrr] = await Promise.all([
      api.get<{ totalTenants: number; activeTenants: number; newTenants: number; mrr: number }>(
        '/api/analytics/overview',
      ),
      api.get<{ distribution: { plan: string; count: number }[] }>('/api/analytics/tenants'),
      api.get<{ history: { month: string; mrr: number }[] }>('/api/analytics/mrr'),
    ]);
    return {
      overview,
      tenantsDistribution: tenants.distribution ?? [],
      mrrHistory: mrr.history ?? [],
    };
  } catch {
    return {
      overview: { totalTenants: 0, activeTenants: 0, newTenants: 0, mrr: 0 },
      tenantsDistribution: [],
      mrrHistory: [],
    };
  }
}
