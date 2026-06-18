import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { registerPlugin, getNavGroups, resetRegistry } from '$lib/plugins/registry.js';
import { hiaiPostPlugin } from '$lib/plugins/hiai-post.js';
import { hiaiStorePlugin } from '$lib/plugins/hiai-store.js';
import { kofiPlugin } from '$lib/plugins/kofi.js';
import { umamiPlugin } from '$lib/plugins/umami.js';
import { buildSiteAdapterPlugins, type SiteAdapterRow } from '$lib/plugins/site-adapter.js';
import { siteAdapterService } from '../../../../backend/src/modules/site-adapter/site-adapter.service.js';
import { userService } from '../../../../backend/src/modules/user/user.service.js';

// Roles allowed into the admin shell. super_admin = global (all sites + platform);
// admin/editor = site admin (scoped to their tenant's site adapters).
const SHELL_ROLES = ['super_admin', 'admin', 'editor'];

// Register static vertical plugins
// (moved into load() so resetRegistry() can clear them between requests — see S1.5.)

export const load: LayoutServerLoad = async ({ locals }) => {
  if (!locals.user) {
    throw redirect(302, '/login');
  }

  // Role (enriched in hooks.server.ts from the custom users table) must be shell-eligible.
  const role = locals.user.role ?? '';
  if (!SHELL_ROLES.includes(role)) {
    throw redirect(302, '/unauthorized');
  }
  const isSuperAdmin = role === 'super_admin';

  // Clear any stale adapters accumulated from prior requests in this process.
  // The registry is a module-level Map shared across requests — without this
  // reset, deleted/disabled adapters and cross-tenant adapters would leak into
  // super_admin's nav. (HIAI_ADMIN_DIFFS §3.3 / S1.5)
  resetRegistry();

  // Static vertical plugins
  registerPlugin(hiaiPostPlugin);
  registerPlugin(hiaiStorePlugin);
  registerPlugin(kofiPlugin);
  registerPlugin(umamiPlugin);

  // Dynamic Site adapters: registered from per-tenant DB config (HIAI_ADMIN_DIFFS §3.3).
  // Fetched in-process from the backend service. super_admin sees all sites; a site
  // admin (admin/editor) sees only adapters for tenants they have explicit access to.
  let adapters: SiteAdapterRow[] = [];
  try {
    let dtos = await siteAdapterService.list();
    if (!isSuperAdmin) {
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
      auth: dto.auth,
      modules: dto.modules,
      enabled: dto.enabled,
    }));
    for (const plugin of buildSiteAdapterPlugins(adapters)) registerPlugin(plugin);
  } catch {
    // A backend hiccup must not break the admin shell — fall back to no adapters.
    adapters = [];
  }

  const navGroups = getNavGroups();
  return { user: locals.user, navGroups, adapters };
};
