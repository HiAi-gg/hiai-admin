import type { Handle } from '@sveltejs/kit';
import { auth } from '../../backend/src/auth/index.js';
import { userService } from '../../backend/src/modules/user/user.service.js';

/**
 * Populate `event.locals.user` / `event.locals.session` from the shared
 * Better Auth instance (mounted in the Elysia backend, proxied through
 * Vite at `/api/auth/*`). Enrich the user with the platform-level role
 * from the custom users table (same pattern as backend auth middleware).
 * The `(admin)/+layout.server.ts` guard reads `locals.user.role` to decide
 * whether to redirect to /login or /unauthorized.
 */
export const handle: Handle = async ({ event, resolve }) => {
  const data = await auth.api.getSession({ headers: event.request.headers });
  let user: App.Locals['user'] = data?.user ?? null;

  // Enrich with platform role + accessible tenant ids if authenticated. These drive
  // the (admin) shell guard (role) and per-tenant scoping of nav + proxy authorization
  // (tenantIds), so a site admin only sees/reaches sites of tenants they have access to.
  if (user) {
    try {
      const baUser = user as any;
      const profile = await userService.getByEmail(baUser.email);
      const tenantIds =
        profile?.role === 'super_admin' || !profile
          ? []
          : await userService.getAccessibleTenantIds(profile.id);
      user = { ...user, role: profile?.role, tenantIds } as App.Locals['user'];
    } catch {
      // Fail closed-ish: role undefined → role-gated routes reject.
    }
  }

  event.locals.user = user;
  event.locals.session = data?.session ?? null;
  return resolve(event);
};
