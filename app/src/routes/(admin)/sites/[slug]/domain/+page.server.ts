import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { normalizeDomains, type DomainRecord } from '$lib/sites/domains.js';

// Domain management page (Block B / B2.4). Loads domain list and handles
// add/verify domain actions.
export const load: PageServerLoad = async ({ params, fetch }) => {
  const { slug } = params;
  let domains: DomainRecord[] = [];
  let error: string | undefined;

  try {
    const res = await fetch(`/api/${slug}/domains`);
    if (res.ok) {
      domains = normalizeDomains(await res.json());
    } else {
      error = `Site backend returned ${res.status}`;
    }
  } catch (e) {
    error = e instanceof Error ? e.message : 'Failed to reach the site backend';
  }

  return { slug, domains, error };
};

export const actions: Actions = {
  addDomain: async ({ request, params, fetch }) => {
    const { slug } = params;
    const formData = await request.formData();
    const domain = String(formData.get('domain') ?? '')
      .trim()
      .toLowerCase();

    if (!domain) {
      return fail(400, { error: 'Domain is required' });
    }

    const res = await fetch(`/api/${slug}/domains`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ domain }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return fail(res.status, { error: body.error ?? `Add failed (${res.status})` });
    }

    return { success: true, added: domain };
  },

  verify: async ({ request, params, fetch }) => {
    const { slug } = params;
    const formData = await request.formData();
    const domainId = String(formData.get('domainId') ?? '').trim();
    const domainName = String(formData.get('domain') ?? '').trim();

    if (!domainId) {
      return fail(400, { error: 'Domain ID is required' });
    }

    const res = await fetch(`/api/${slug}/domains/${domainId}/verify`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return fail(res.status, { error: body.error ?? `Verify failed (${res.status})` });
    }

    return { success: true, verified: domainName };
  },
};
