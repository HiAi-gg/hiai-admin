import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import {
  extractBlocks,
  validateBlock,
  isPersistedId,
  toWebsBlock,
  diffDeletedIds,
  type HomepageBlock,
} from '$lib/sites/homepage.js';
import { getSiteDataProvider } from '$lib/server/providers/runtime.js';

// Homepage blocks editor (Block B / B2.2). Loads the ordered list of blocks
// from the site backend by slug and handles reorder/save actions.
export const load: PageServerLoad = async ({ params, fetch }) => {
  const { slug } = params;
  let blocks: HomepageBlock[] = [];
  let error: string | undefined;

  try {
    const provider = await getSiteDataProvider(slug);
    if (provider) {
      blocks = extractBlocks(await provider.listHomepageBlocks());
      return { slug, blocks, error };
    }

    // Use slug-based endpoint to fetch blocks from site backend
    const res = await fetch(`/api/${slug}/homepage-blocks/admin/site-by-slug/${slug}`);
    if (res.ok) {
      blocks = extractBlocks(await res.json());
    } else {
      error = `Site backend returned ${res.status}`;
    }
  } catch (e) {
    error = e instanceof Error ? e.message : 'Failed to reach the site backend';
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

    try {
      const provider = await getSiteDataProvider(slug);
      if (provider) {
        const saved = await provider.saveHomepageBlocks(
          blocks.map((block, order) => ({
            id: block.id,
            type: block.type,
            order,
            data: block.data,
          })),
        );
        return { success: true, updated: saved.length };
      }
    } catch (error) {
      return fail(502, {
        error: error instanceof Error ? error.message : 'Provider save failed',
        blocks,
      });
    }

    // Validate all blocks before save.
    for (const block of blocks) {
      const validation = validateBlock(block);
      if (!validation.ok) {
        return fail(400, { error: validation.error, blocks });
      }
    }

    try {
      // Load the current persisted blocks from the backend to compute deletions.
      const currentRes = await fetch(`/api/${slug}/homepage-blocks/admin/site-by-slug/${slug}`);
      if (!currentRes.ok) {
        return fail(currentRes.status, {
          error: `Failed to fetch current blocks (${currentRes.status})`,
          blocks,
        });
      }
      const currentBlocks = extractBlocks(await currentRes.json());

      // Compute which persisted blocks are no longer present in the submitted set.
      const deletedIds = diffDeletedIds(currentBlocks, blocks);

      // Delete removed blocks first (order: delete → upsert).
      for (const id of deletedIds) {
        const res = await fetch(`/api/${slug}/homepage-blocks/${id}`, {
          method: 'DELETE',
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          return fail(res.status, {
            error: body.error ?? `Delete failed for block ${id} (${res.status})`,
            blocks,
          });
        }
      }

      // Persist each block in display order: existing blocks (numeric id) are updated
      // (PUT /homepage-blocks/:id), new editor blocks (client UUID) are created
      // (POST /homepage-blocks, resolving the site by slug). order_index = array index.
      for (let i = 0; i < blocks.length; i++) {
        const block = blocks[i];
        const payload = toWebsBlock(block, i);
        const res = isPersistedId(block.id)
          ? await fetch(`/api/${slug}/homepage-blocks/${block.id}`, {
              method: 'PUT',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify(payload),
            })
          : await fetch(`/api/${slug}/homepage-blocks`, {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ ...payload, site: slug }),
            });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          return fail(res.status, {
            error: body.error ?? `Save failed for block ${i + 1} (${res.status})`,
            blocks,
          });
        }
      }
    } catch (e) {
      return fail(502, { error: e instanceof Error ? e.message : 'Save failed', blocks });
    }

    return { success: true, updated: blocks.length };
  },
};
