import type { PageServerLoad } from './$types';

/**
 * Preload the saved Ko-fi webhook URL so admins can see what is currently
 * configured. The verification token is never returned to the browser — it
 * is write-only. The Ko-fi widget preview URL is derived from
 * `KOFI_PAGE_URL` (the public Ko-fi.com/username page), falling back to a
 * sensible default if unset.
 */
export const load: PageServerLoad = async () => {
  const kofiPageUrl = process.env.KOFI_PAGE_URL || process.env.PUBLIC_KOFI_PAGE_URL || '';
  return {
    kofiPageUrl: kofiPageUrl.replace(/\/$/, ''),
  };
};
