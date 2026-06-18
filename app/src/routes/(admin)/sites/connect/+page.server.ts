import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { tenantService } from '../../../../../../backend/src/modules/tenant/tenant.service.js';

const MODULES = ['articles', 'homepage', 'domains', 'kofi', 'newsletter', 'generation'] as const;

export const load: PageServerLoad = async () => {
  let tenants: Array<{ id: string; name: string; slug: string }> = [];
  try {
    const result = await tenantService.list({});
    tenants = result.data.map((t: { id: string; name: string; slug: string }) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
    }));
  } catch {
    // Gracefully tolerate backend hiccup — show empty tenants list
  }
  return { tenants };
};

export const actions: Actions = {
  default: async ({ request, fetch }) => {
    const form = await request.formData();
    const tenantId = String(form.get('tenantId') ?? '');
    const slug = String(form.get('slug') ?? '').trim();
    const name = String(form.get('name') ?? '').trim();
    const backendUrl = String(form.get('backendUrl') ?? '').trim();
    const auth = String(form.get('auth') ?? 'jwt');
    const jwtSecret = String(form.get('jwtSecret') ?? '').trim();
    const modules = MODULES.filter((m) => form.get(`module:${m}`) === 'on');

    const values = { tenantId, slug, name, backendUrl, auth, modules };

    if (!tenantId || !slug || !name || !backendUrl) {
      return fail(400, { error: 'Tenant, name, slug and backend URL are required.', values });
    }

    const res = await fetch('/api/site-adapters', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        tenantId,
        slug,
        name,
        backendUrl,
        auth,
        jwtSecret: jwtSecret || undefined,
        modules,
      }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return fail(res.status, { error: body.error ?? 'Failed to connect site.', values });
    }

    throw redirect(303, '/dashboard');
  },
};
