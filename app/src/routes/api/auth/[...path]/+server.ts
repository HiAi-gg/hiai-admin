import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * SvelteKit server route that proxies `/api/auth/*` to the Better Auth handler
 * mounted on the Elysia backend.
 *
 * Why this exists:
 *   - In dev, `vite.config.ts` proxies `/api/auth` → backend (works).
 *   - In production (adapter-node), Vite is gone — SvelteKit is the only
 *     HTTP server. Without an explicit route, `/api/auth/sign-in/email`
 *     would be eaten by the catch-all `/api/[plugin]/[...path]`, which
 *     treats `auth` as a plugin id and returns 404 ("Plugin \"auth\" not found").
 *
 * This route takes priority over `[plugin]/[...path]` because SvelteKit matches
 * static path segments before dynamic ones. So `/api/auth/sign-in/email` reaches
 * this handler, not the plugin catch-all.
 *
 * Behaviour:
 *   - Forwards method, body (for non-GET/HEAD), `content-type`, `cookie`, and `set-cookie`.
 *   - Carries the query string through.
 *   - Returns the backend response verbatim so Better Auth's cookie/cache semantics
 *     and 4xx error shapes are preserved.
 */
const BACKEND = process.env.BACKEND_URL ?? 'http://localhost:50200';

async function proxyAuth(request: Request, path: string): Promise<Response> {
  const url = new URL(request.url);
  const target = `${BACKEND}/api/auth/${path}${url.search}`;

  const headers = new Headers();
  // Forward headers the backend actually inspects. Better Auth needs
  // `origin` for its CSRF/origin check, `host` for redirect URL building,
  // and `content-type` / `accept` for body parsing and content negotiation.
  // We intentionally do NOT forward `cookie` for sign-in (caller has no
  // session yet) but DO forward it on every other path so the backend can
  // read the session cookie issued on sign-in.
  for (const name of [
    'content-type',
    'accept',
    'accept-language',
    'origin',
    'referer',
    'host',
    'cookie',
    'user-agent',
    'x-forwarded-for',
    'x-forwarded-host',
    'x-forwarded-proto',
  ]) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  // `host` should be the BACKEND's host so Better Auth builds correct
  // redirect URLs pointing at the backend, not the SvelteKit host.
  try {
    headers.set('host', new URL(BACKEND).host);
  } catch {
    /* ignore — fall back to whatever was sent */
  }

  const init: RequestInit = { method: request.method, headers };
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = await request.text();
  }

  try {
    const res = await fetch(target, init);
    const body = await res.text();

    // Preserve Set-Cookie (multiple Set-Cookie headers must be passed as an array).
    const responseHeaders = new Headers();
    const setCookie = res.headers.getSetCookie?.();
    if (setCookie && setCookie.length > 0) {
      for (const c of setCookie) responseHeaders.append('set-cookie', c);
    } else {
      const single = res.headers.get('set-cookie');
      if (single) responseHeaders.set('set-cookie', single);
    }
    const resContentType = res.headers.get('content-type');
    if (resContentType) responseHeaders.set('content-type', resContentType);

    return new Response(body, {
      status: res.status,
      statusText: res.statusText,
      headers: responseHeaders,
    });
  } catch (err) {
    return json(
      { error: err instanceof Error ? err.message : 'Auth proxy error' },
      { status: 502 },
    );
  }
}

const handler: RequestHandler = ({ request, params }) => {
  const raw = params.path;
  const path = Array.isArray(raw) ? raw.join('/') : (raw ?? '');
  return proxyAuth(request, path);
};

export const POST = handler;
export const PUT = handler;
export const DELETE = handler;
export const PATCH = handler;
export const OPTIONS = handler;
