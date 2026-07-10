import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { extractBlocks, validateBlock, type HomepageBlock } from '$lib/sites/homepage.js';

// Canonical Site adapter contract: GET/PUT /homepage-blocks. PUT replaces the
// complete ordered set; the downstream adapter is responsible for atomicity.
export const load: PageServerLoad = async ({ params, fetch }) => {
  const { slug } = params;
  let blocks: HomepageBlock[] = [];
  let error: string | undefined;

  try {
    const res = await fetch(`/api/${slug}/homepage-blocks`);
    if (res.ok) {
      blocks = extractBlocks(await res.json());
    } else {
      error = `Site backend returned ${res.status}`;
    }
  } catch (cause) {
    error = cause instanceof Error ? cause.message : 'Failed to reach the site backend';
  }

  return { slug, blocks, error };
};

export const actions: Actions = {
  save: async ({ request, params, fetch }) => {
    const { slug } = params;
    const formData = await request.formData();
    const blocksJson = String(formData.get('blocks') ?? '[]');

    let blocks: HomepageBlock[];
    try {
      blocks = JSON.parse(blocksJson);
    } catch {
      return fail(400, { error: 'Invalid blocks JSON' });
    }

    for (const block of blocks) {
      const validation = validateBlock(block);
      if (!validation.ok) return fail(400, { error: validation.error, blocks });
    }

    try {
      const res = await fetch(`/api/${slug}/homepage-blocks`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          blocks: blocks.map((block, order) => ({ ...block, order })),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        return fail(res.status, {
          error: body.error ?? `Save failed (${res.status})`,
          blocks,
        });
      }
    } catch (cause) {
      return fail(502, { error: cause instanceof Error ? cause.message : 'Save failed', blocks });
    }

    return { success: true, updated: blocks.length };
  },
};
