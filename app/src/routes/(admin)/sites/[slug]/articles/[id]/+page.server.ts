import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import {
  normalizeArticle,
  validateArticleDraft,
  STATUS_OPTIONS,
  type ArticleStatus,
} from '$lib/sites/articles.js';

// Article editor (Block B / B1.2 + B1.4). `id === 'new'` is the create form; any other id
// loads an existing article from the site backend via the generic proxy.
export const load: PageServerLoad = async ({ params, fetch }) => {
  const { slug, id } = params;
  if (id === 'new') {
    return {
      slug,
      isNew: true,
      article: { id: '', title: '', status: 'draft', language: 'en', slug: '', content: '' },
    };
  }

  try {
    const res = await fetch(`/api/${slug}/articles/${id}`);
    if (!res.ok) {
      return { slug, isNew: false, article: null, error: `Site backend returned ${res.status}` };
    }
    const body = await res.json();
    const raw = body.article ?? body.data ?? body;
    return { slug, isNew: false, article: normalizeArticle(raw) };
  } catch (e) {
    return {
      slug,
      isNew: false,
      article: null,
      error: e instanceof Error ? e.message : 'Failed to load article',
    };
  }
};

export const actions: Actions = {
  save: async ({ request, params, fetch }) => {
    const { slug, id } = params;
    const form = await request.formData();
    const title = String(form.get('title') ?? '').trim();
    const articleSlug = String(form.get('slug') ?? '').trim();
    const status = String(form.get('status') ?? 'draft');
    const language = String(form.get('language') ?? 'en').trim();
    const content = String(form.get('content') ?? '');

    const values = { title, slug: articleSlug, status, language, content };

    const validation = validateArticleDraft({ title, status, content });
    if (!validation.ok) {
      return fail(400, { error: validation.error, values });
    }
    if (!(STATUS_OPTIONS as readonly string[]).includes(status)) {
      return fail(400, { error: `Invalid status: ${status}`, values });
    }
    const typedStatus = status as ArticleStatus;

    const isNew = id === 'new';
    const payload = {
      title,
      slug: articleSlug || undefined,
      status: typedStatus,
      language,
      content,
    };

    const res = await fetch(isNew ? `/api/${slug}/articles` : `/api/${slug}/articles/${id}`, {
      method: isNew ? 'POST' : 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return fail(res.status, { error: body.error ?? `Save failed (${res.status})`, values });
    }

    throw redirect(303, `/sites/${slug}/articles`);
  },
};
