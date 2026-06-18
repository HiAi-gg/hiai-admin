import type { PageServerLoad } from './$types';
import { siteAdapterService } from '../../../../../backend/src/modules/site-adapter/site-adapter.service.js';
import { userService } from '../../../../../backend/src/modules/user/user.service.js';

export interface SiteAdapterRow {
  slug: string;
  name: string;
  backendUrl: string;
  modules: string[];
  enabled?: boolean;
  tenantId: string;
}

// Site adapters overview (Block B / B2.1). Loads the list of connected sites
// from the admin backend via in-process service (same pattern as layout).
export const load: PageServerLoad = async ({ locals }) => {
  let adapters: SiteAdapterRow[] = [];
  let error: string | undefined;

  try {
    let dtos = await siteAdapterService.list();
    // Site admins (non-super_admin) only see sites for tenants they have access to.
    if (locals.user && locals.user.role !== 'super_admin') {
      const profile = await userService.getByEmail(locals.user.email);
      const tenantIds = profile ? await userService.getAccessibleTenantIds(profile.id) : [];
      const allowed = new Set(tenantIds);
      dtos = dtos.filter((d: { tenantId: string }) => allowed.has(d.tenantId));
    }
    adapters = dtos.map((dto: any) => ({
      tenantId: dto.tenantId,
      slug: dto.slug,
      name: dto.name,
      backendUrl: dto.backendUrl,
      modules: dto.modules,
      enabled: dto.enabled,
    }));
  } catch (e) {
    error = e instanceof Error ? e.message : 'Failed to load site adapters';
  }

  return { adapters, error };
};
