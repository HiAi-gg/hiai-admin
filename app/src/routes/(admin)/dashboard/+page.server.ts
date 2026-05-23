import { api } from '$lib/api.js';

export async function load() {
  try {
    const [overview, tenants] = await Promise.all([
      api.get<{ totalTenants: number; activeTenants: number; newTenants: number; mrr: number }>('/api/analytics/overview'),
      api.get<{ distribution: { plan: string; count: number }[] }>('/api/analytics/tenants'),
    ]);
    return { overview, tenantsDistribution: tenants.distribution };
  } catch {
    return { overview: { totalTenants: 0, activeTenants: 0, newTenants: 0, mrr: 0 }, tenantsDistribution: [] };
  }
}
