import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch }) => {
  const [overviewRes, mrrRes, churnRes, tenantsRes, topTenantsRes] = await Promise.allSettled([
    fetch('/api/analytics/overview'),
    fetch('/api/analytics/mrr'),
    fetch('/api/analytics/churn'),
    fetch('/api/analytics/tenants'),
    fetch('/api/analytics/top-tenants?limit=10'),
  ]);

  const overview =
    overviewRes.status === 'fulfilled' && overviewRes.value.ok
      ? await overviewRes.value.json()
      : {};
  const mrr =
    mrrRes.status === 'fulfilled' && mrrRes.value.ok ? await mrrRes.value.json() : { trend: [] };
  const churn =
    churnRes.status === 'fulfilled' && churnRes.value.ok
      ? await churnRes.value.json()
      : { trend: [] };
  const tenantDistribution =
    tenantsRes.status === 'fulfilled' && tenantsRes.value.ok
      ? await tenantsRes.value.json()
      : { byPlan: [] };
  const tenantsDistribution =
    topTenantsRes.status === 'fulfilled' && topTenantsRes.value.ok
      ? await topTenantsRes.value.json()
      : { topTenants: [] };

  return { overview, mrr, churn, tenantDistribution, tenantsDistribution };
};
