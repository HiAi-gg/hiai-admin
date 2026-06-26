import { Elysia } from 'elysia';
import type { User } from 'better-auth';
import { auth } from '../../auth/index.js';
import { userService } from '../../modules/user/user.service.js';

/**
 * Loads the Better Auth session and enriches the user with the
 * platform-level role stored in the custom `users` table.
 *
 * The custom `users` table is the source of truth for `role` and is
 * keyed by email (Better Auth's `user.id` is not the same as our
 * platform user id). The same email-based lookup is used by
 * `/api/users/me`, so behaviour stays consistent.
 */
export async function loadSession(headers: Headers) {
  const session = await auth.api.getSession({ headers });
  if (!session) return { user: null, session: null };

  const baUser: User = session.user;
  let role: string | undefined;
  try {
    const profile = await userService.getByEmail(baUser?.email);
    role = profile?.role;
  } catch {
    // Fail closed — leave role undefined so role-gated routes 403.
    role = undefined;
  }

  return {
    user: { ...baUser, role },
    session: session.session,
  };
}

export const authMiddleware = new Elysia({ name: 'auth' }).macro({
  requireAuth: {
    beforeHandle: async ({ user, session, set }: any) => {
      if (!user || !session) {
        set.status = 401;
        return { error: 'Unauthorized' };
      }
    },
  },
  requireSuperAdmin: {
    beforeHandle: async ({ user, session, set }: any) => {
      if (!user || !session) {
        set.status = 401;
        return { error: 'Unauthorized' };
      }
      if (user.role !== 'super_admin') {
        set.status = 403;
        return { error: 'Forbidden — super admin required' };
      }
    },
  },
});
