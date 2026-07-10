import type { PageServerLoad } from './$types';
import { siteAdapterService } from '../../../../../backend/src/modules/site-adapter/site-adapter.service.js';
import { filterAccessibleSiteAdapters } from '$lib/server/site-access.js';

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
    const dtos = await filterAccessibleSiteAdapters(await siteAdapterService.list(), locals.user);
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
