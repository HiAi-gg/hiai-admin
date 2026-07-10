import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { extractArticles, buildBulkStatusBody, type Article } from '$lib/sites/articles.js';

// Canonical Site adapter contract: GET /articles and POST /articles/bulk-status.
export const load: PageServerLoad = async ({ params, fetch }) => {
  const { slug } = params;
  let articles: Article[] = [];
  let error: string | undefined;
  let draftCount: number | null = null;

  try {
    const res = await fetch(`/api/${slug}/articles`);
    if (res.ok) {
      articles = extractArticles(await res.json());
      draftCount = articles.filter((article) => article.status === 'draft').length;
    } else {
      error = `Site backend returned ${res.status}`;
    }
  } catch (e) {
    error = e instanceof Error ? e.message : 'Failed to reach the site backend';
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

    const res = await fetch(`/api/${slug}/articles/bulk-status`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ids: body.ids, status: body.status }),
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      return fail(res.status, { error: errBody.error ?? `Bulk update failed (${res.status})` });
    }

    return { success: true, updated: ids.length, status };
  },
};
