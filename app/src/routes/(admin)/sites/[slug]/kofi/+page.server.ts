import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import {
  extractDonations,
  normalizeKofiConfig,
  validateKofiConfig,
  type Donation,
  type KofiConfig,
} from '$lib/sites/kofi.js';

// Canonical Site adapter contract: GET/PUT /kofi and GET /kofi/donations.
export const load: PageServerLoad = async ({ params, fetch }) => {
  const { slug } = params;
  let config: KofiConfig = { webhookUrl: '', verificationToken: '', enabled: false };
  let donations: Donation[] = [];
  let error: string | undefined;

  try {
    const [configResponse, donationsResponse] = await Promise.all([
      fetch(`/api/${slug}/kofi`),
      fetch(`/api/${slug}/kofi/donations`),
    ]);
    if (configResponse.ok) config = normalizeKofiConfig(await configResponse.json());
    else error = `Failed to load Ko-fi config (${configResponse.status})`;
    if (donationsResponse.ok) donations = extractDonations(await donationsResponse.json());
  } catch (cause) {
    error = cause instanceof Error ? cause.message : 'Failed to reach the site backend';
  }

  return { slug, config, donations, error };
};

export const actions: Actions = {
  saveConfig: async ({ request, params, fetch }) => {
    const { slug } = params;
    const form = await request.formData();
    const config: KofiConfig = {
      enabled: form.get('enabled') === 'on',
      webhookUrl: String(form.get('webhookUrl') ?? '').trim(),
      verificationToken: String(form.get('verificationToken') ?? '').trim(),
    };

    const validation = validateKofiConfig(config);
    if (!validation.ok) return fail(400, { error: validation.error, values: config });

    const res = await fetch(`/api/${slug}/kofi`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(config),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return fail(res.status, {
        error: body.error ?? `Failed to save Ko-fi config (${res.status})`,
        values: config,
      });
    }

    return { success: true, config };
  },
};
