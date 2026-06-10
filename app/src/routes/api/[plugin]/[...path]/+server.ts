import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getProxyConfig } from '$lib/plugins/registry.js';

async function proxyRequest(request: Request, pluginId: string, path: string): Promise<Response> {
  const config = getProxyConfig(pluginId);
  if (!config) return json({ error: `Plugin "${pluginId}" not found` }, { status: 404 });

  const targetUrl = `${config.target}/${path}`;
  const headers = new Headers();
  const contentType = request.headers.get('content-type');
  if (contentType) headers.set('content-type', contentType);
  const auth = request.headers.get('authorization');
  if (auth) headers.set('authorization', auth);
  const cookie = request.headers.get('cookie');
  if (cookie) headers.set('cookie', cookie);

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

export const GET: RequestHandler = async ({
  params,
  request,
}: {
  params: { plugin: string; path: string };
  request: Request;
}) => proxyRequest(request, params.plugin, params.path);
export const POST: RequestHandler = async ({
  params,
  request,
}: {
  params: { plugin: string; path: string };
  request: Request;
}) => proxyRequest(request, params.plugin, params.path);
export const PUT: RequestHandler = async ({
  params,
  request,
}: {
  params: { plugin: string; path: string };
  request: Request;
}) => proxyRequest(request, params.plugin, params.path);
export const DELETE: RequestHandler = async ({
  params,
  request,
}: {
  params: { plugin: string; path: string };
  request: Request;
}) => proxyRequest(request, params.plugin, params.path);
export const PATCH: RequestHandler = async ({
  params,
  request,
}: {
  params: { plugin: string; path: string };
  request: Request;
}) => proxyRequest(request, params.plugin, params.path);
