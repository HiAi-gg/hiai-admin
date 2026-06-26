import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { api } from '$lib/api.js';

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) {
    throw redirect(302, '/login');
  }

  let tenants: Array<{
    tenantId: string;
    slug: string;
    name: string;
    status: string;
    plan: string;
    role: string;
    joinedAt: string;
  }> = [];

  try {
    const res = await api.get<{ data: typeof tenants }>('/api/profile/tenants');
    tenants = res.data ?? [];
  } catch {
    // Render empty state when the API is unavailable.
  }

  return { tenants };
};
