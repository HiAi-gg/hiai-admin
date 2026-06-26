import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { api } from '$lib/api.js';

type PlatformProfile = {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  role: string;
  twoFactorEnabled: boolean;
  lastLoginAt: string | null;
  createdAt: string | null;
};

type UserTenant = {
  tenantId: string;
  slug: string;
  name: string;
  status: string;
  plan: string;
  role: string;
  joinedAt: string;
};

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) {
    throw redirect(302, '/login');
  }

  // Fetch the platform profile (custom users table) and the user's tenant
  // memberships in parallel. The custom table is the source of truth for
  // role / avatar / 2FA — Better Auth's user record only carries name/email.
  let profile: PlatformProfile | null = null;
  let tenants: UserTenant[] = [];

  try {
    const [profileRes, tenantsRes] = await Promise.all([
      api.get<{ data: PlatformProfile | null }>('/api/profile'),
      api.get<{ data: UserTenant[] }>('/api/profile/tenants'),
    ]);
    profile = profileRes.data ?? null;
    tenants = tenantsRes.data ?? [];
  } catch {
    // Profile/tenants endpoint hiccup — render an empty form so the user can
    // still see account-level info from the Better Auth session.
  }

  return {
    profile,
    sessionUser: locals.user,
    tenants,
  };
};
