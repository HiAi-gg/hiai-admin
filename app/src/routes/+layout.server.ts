import type { LayoutServerLoad } from './$types';

/**
 * Root layout server load — exposes the public Umami tracking config to
 * every route so the root layout can include the tracking script.
 *
 * The script is only injected when both `PUBLIC_UMAMI_URL` and
 * `PUBLIC_UMAMI_WEBSITE_ID` are set (Umami convention — they are exposed
 * to the browser). When `PUBLIC_UMAMI_URL` is unset, the layout omits the
 * tag entirely (no empty `<script src=…>`).
 *
 * Two env names are accepted for compatibility:
 *   - `PUBLIC_UMAMI_URL` / `PUBLIC_UMAMI_WEBSITE_ID` (preferred — matches SvelteKit convention)
 *   - `UMAMI_URL` / `UMAMI_WEBSITE_ID` (legacy — already used in umami/+page.server.ts)
 */
export const load: LayoutServerLoad = () => {
  const umamiUrl = process.env.PUBLIC_UMAMI_URL || process.env.UMAMI_URL || '';
  const umamiWebsiteId = process.env.PUBLIC_UMAMI_WEBSITE_ID || process.env.UMAMI_WEBSITE_ID || '';
  return {
    umami: {
      url: umamiUrl.replace(/\/$/, ''),
      websiteId: umamiWebsiteId,
    },
  };
};
