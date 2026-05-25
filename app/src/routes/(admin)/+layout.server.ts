import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { registerPlugin, getNavGroups } from '$lib/plugins/registry.js';
import { hiaiPostPlugin } from '$lib/plugins/hiai-post.js';
import { hiaiStorePlugin } from '$lib/plugins/hiai-store.js';
import { kofiPlugin } from '$lib/plugins/kofi.js';
import { umamiPlugin } from '$lib/plugins/umami.js';

// Register all plugins
registerPlugin(hiaiPostPlugin);
registerPlugin(hiaiStorePlugin);
registerPlugin(kofiPlugin);
registerPlugin(umamiPlugin);

export const load: LayoutServerLoad = async ({ locals, fetch }) => {
  if (!locals.user) {
    throw redirect(302, '/login');
  }

  // Verify super_admin role
  const res = await fetch('/api/users/me');
  if (res.ok) {
    const user = await res.json();
    if (user.role !== 'super_admin') {
      throw redirect(302, '/unauthorized');
    }
  }

  const navGroups = getNavGroups();
  return { user: locals.user, navGroups };
};
