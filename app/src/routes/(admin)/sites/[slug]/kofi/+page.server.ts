import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import {
  normalizeKofiConfig,
  validateKofiConfig,
  type KofiConfig,
  type Donation,
} from '$lib/sites/kofi.js';

// Ko-fi integration for a connected site (Block B / B3). Proxies to the site backend
// through the generic catch-all `/api/{slug}/...`. The backend contract is loose;
// `normalizeKofiConfig` and `extractDonations` normalize whatever shape the tenant backend returns.
export const load: PageServerLoad = async ({ params, fetch }) => {
  const { slug } = params;
  let config: KofiConfig = { webhookUrl: '', verificationToken: '', enabled: false };
  let donations: Donation[] = [];
  let error: string | undefined;

  // Load config from the site object (webs stores ko-fi in site.config.kofi).
  try {
    const res = await fetch(`/api/${slug}/sites/${slug}`);
    if (res.ok) {
      const body = await res.json();
      const site =
        body && typeof body === 'object' && !Array.isArray(body) && body.site ? body.site : body;
      // Extract ko-fi config from site.config.kofi and map to KofiConfig.
      if (site && typeof site === 'object' && site.config) {
        const kofiData = site.config.kofi || {};
        config = normalizeKofiConfig({
          kofi_enabled: kofiData.enabled,
          kofi_url: kofiData.url,
        });
      }
    } else {
      // Non-ok response is best-effort; don't error the whole page.
      error = `Failed to load Ko-fi config (${res.status})`;
    }
  } catch (e) {
    error = e instanceof Error ? e.message : 'Failed to reach the site backend';
  }

  // Donations are not stored in webs; gracefully return empty list.
  // (A real donations table is a future webs feature.)

  return { slug, config, donations, error };
};

export const actions: Actions = {
  saveConfig: async ({ request, params, fetch }) => {
    const { slug } = params;
    const form = await request.formData();

    // Parse form data into a KofiConfig.
    const enabled = form.get('enabled') === 'on';
    const webhookUrl = String(form.get('webhookUrl') ?? '').trim();
    // Note: webs does not store a verification token; this field is kept in the form for UI completeness
    // but is NOT sent to the backend (webs only stores enabled and url).
    const verificationToken = String(form.get('verificationToken') ?? '').trim();

    const config = {
      webhookUrl,
      verificationToken,
      enabled,
    };

    // Validate.
    const validation = validateKofiConfig(config);
    if (!validation.ok) {
      return fail(400, { error: validation.error, values: config });
    }

    // Map to webs API schema: kofi_enabled and kofi_url.
    const updatePayload = {
      kofi_enabled: enabled,
      kofi_url: webhookUrl || undefined,
    };

    // PUT to backend.
    const res = await fetch(`/api/${slug}/sites/${slug}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(updatePayload),
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      return fail(res.status, {
        error: errBody.error ?? `Failed to save Ko-fi config (${res.status})`,
        values: config,
      });
    }

    return { success: true, config };
  },
};
