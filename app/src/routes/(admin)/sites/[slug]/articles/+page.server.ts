import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { extractArticles, buildBulkStatusBody, type Article } from '$lib/sites/articles.js';

// Article list for a connected site (Block B / B1.1). Proxies to the site backend
// through the generic catch-all `/api/{slug}/...`. Calls webs's real admin contract
// (`/articles/admin/list?site=<slug>` → `{articles,pagination}`); `extractArticles`
// unwraps the `articles` envelope. The adapter `backendUrl` carries the `/api/v1` base.
export const load: PageServerLoad = async ({ params, fetch }) => {
  const { slug } = params;
  let articles: Article[] = [];
  let error: string | undefined;
  let draftCount: number | null = null;

  try {
    const res = await fetch(`/api/${slug}/articles/admin/list?site=${encodeURIComponent(slug)}`);
    if (res.ok) {
      articles = extractArticles(await res.json());
    } else {
      error = `Site backend returned ${res.status}`;
    }
  } catch (e) {
    error = e instanceof Error ? e.message : 'Failed to reach the site backend';
  }

  // Draft count is best-effort; a backend without the endpoint must not break the page.
  try {
    const res = await fetch(`/api/${slug}/articles/drafts/count?site=${encodeURIComponent(slug)}`);
    if (res.ok) {
      const body = await res.json();
      const n = typeof body === 'number' ? body : (body.draftCount ?? body.count);
      if (typeof n === 'number') draftCount = n;
    }
  } catch {
    // ignore — draft count is optional
  }

  return { slug, articles, error, draftCount };
};

export const actions: Actions = {
  bulkStatus: async ({ request, params, fetch }) => {
    const { slug } = params;
    const form = await request.formData();
    const ids = form.getAll('ids').map(String).filter(Boolean);
    const status = String(form.get('status') ?? '');

    let body: ReturnType<typeof buildBulkStatusBody>;
    try {
      body = buildBulkStatusBody(ids, status);
    } catch (e) {
      return fail(400, { error: e instanceof Error ? e.message : 'Invalid request' });
    }

    // webs bulk-status expects numeric `articleIds` (article ids are numeric in webs).
    const res = await fetch(`/api/${slug}/articles/bulk-status`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ articleIds: body.ids.map(Number), status: body.status }),
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      return fail(res.status, { error: errBody.error ?? `Bulk update failed (${res.status})` });
    }

    return { success: true, updated: ids.length, status };
  },
};
