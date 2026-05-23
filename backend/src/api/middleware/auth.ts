import { Elysia } from 'elysia';
import { auth } from '../../auth/index.js';

export const authMiddleware = new Elysia({ name: 'auth' })
  .derive(async ({ request }) => {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) return { user: null, session: null };
    return { user: session.user, session: session.session };
  })
  .macro({
    requireAuth: {
      resolve: async ({ user, session, set }) => {
        if (!user || !session) {
          set.status = 401;
          throw new Error('Unauthorized');
        }
        return { user, session };
      },
    },
    requireSuperAdmin: {
      resolve: async ({ user, session, set }) => {
        if (!user || !session) { set.status = 401; throw new Error('Unauthorized'); }
        if ((user as any).role !== 'super_admin') { set.status = 403; throw new Error('Forbidden — super admin required'); }
        return { user, session };
      },
    },
  });
