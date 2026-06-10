import type { Handle } from '@sveltejs/kit';
import { auth } from '../../backend/src/auth/index.js';

/**
 * Populate `event.locals.user` / `event.locals.session` from the shared
 * Better Auth instance (mounted in the Elysia backend, proxied through
 * Vite at `/api/auth/*`). The `(admin)/+layout.server.ts` guard reads
 * `locals.user` to decide whether to redirect to /login.
 */
export const handle: Handle = async ({ event, resolve }) => {
  const data = await auth.api.getSession({ headers: event.request.headers });
  event.locals.user = data?.user ?? null;
  event.locals.session = data?.session ?? null;
  return resolve(event);
};
