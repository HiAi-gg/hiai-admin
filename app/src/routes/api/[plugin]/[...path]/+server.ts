import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getProxyConfig, getPlugin } from '$lib/plugins/registry.js';
import { resolveTarget } from '$lib/server/proxy-target.js';
import { mintBackendToken } from '$lib/server/backend-token.js';
import { resolveAdapterSecret } from '$lib/server/adapter-secret.js';

async function proxyRequest(
  request: Request,
  pluginId: string,
  path: string,
  user: App.Locals['user'],
): Promise<Response> {
  const config = getProxyConfig(pluginId);
  if (!config) return json({ error: `Plugin "${pluginId}" not found` }, { status: 404 });

  // Authorization: a site admin may only reach sites of tenants they have access to.
  // super_admin → all. Non-super-admin → site adapters whose tenantId is in user.tenantIds;
  // platform/static plugins (social/shop/kofi/umami) are super_admin-only.
  if (!user) return json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'super_admin') {
    const plugin = getPlugin(pluginId) as { kind?: string; tenantId?: string } | undefined;
    const allowed =
      plugin?.kind === 'site' &&
      !!plugin.tenantId &&
      (user.tenantIds ?? []).includes(plugin.tenantId);
    if (!allowed) return json({ error: 'Forbidden' }, { status: 403 });
  }

  // Anti-SSRF: constrain the attacker-controlled `path` to the configured backend origin.
  const target = resolveTarget(config.target, path);
  if (!target) return json({ error: 'Invalid proxy path' }, { status: 400 });
  // Forward the query string (SvelteKit's [...path] excludes it). The target's origin/path
  // are already validated above; only the search is carried over from the caller.
  const incomingSearch = new URL(request.url).search;
  if (incomingSearch) target.search = incomingSearch;
  const targetUrl = target.toString();

  const headers = new Headers();
  const contentType = request.headers.get('content-type');
  if (contentType) headers.set('content-type', contentType);

  const secret = config.auth === 'jwt' ? await resolveAdapterSecret(pluginId) : undefined;
  if (config.auth === 'jwt' && user && secret) {
    // SSO: mint a backend token from the admin session in the site backend's format,
    // rather than forwarding the admin's own cookie/authorization (§12).
    const token = mintBackendToken(
      { userId: user.id, email: user.email, role: user.role ?? 'admin' },
      secret,
    );
    headers.set('authorization', `Bearer ${token}`);
  } else {
    // Fallback (api-key adapters, or jwt without a configured secret): forward caller creds.
    const auth = request.headers.get('authorization');
    if (auth) headers.set('authorization', auth);
    const cookie = request.headers.get('cookie');
    if (cookie) headers.set('cookie', cookie);
  }

  const init: RequestInit = { method: request.method, headers };
  if (request.method !== 'GET' && request.method !== 'HEAD') init.body = await request.text();

  try {
    const res = await fetch(targetUrl, init);
    const body = await res.text();
    return new Response(body, {
      status: res.status,
      headers: { 'content-type': res.headers.get('content-type') ?? 'application/json' },
    });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Proxy error' }, { status: 502 });
  }
}

const handler: RequestHandler = ({ params, request, locals }) =>
  proxyRequest(request, params.plugin, params.path, locals.user);

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const DELETE = handler;
export const PATCH = handler;
