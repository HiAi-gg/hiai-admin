import { error } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { siteAdapterService } from '../../../../../../backend/src/modules/site-adapter/site-adapter.service.js';
import { canAccessSiteAdapter } from '$lib/server/site-access.js';

export const load: LayoutServerLoad = async ({ params, locals }) => {
  const adapter = await siteAdapterService.getBySlug(params.slug);
  if (!adapter) {
    error(404, 'Site adapter not found');
  }
  if (!(await canAccessSiteAdapter(adapter, locals.user))) {
    error(403, 'You do not have access to this site');
  }

  return { siteSlug: params.slug };
};
