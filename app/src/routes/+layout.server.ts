import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import type { LayoutServerLoad } from './$types';

/**
 * Read the hiai-admin root `package.json` once at server start and
 * surface its `version` to every page. The file lookup is resolved
 * relative to this module (the root `+layout.server.ts` lives in
 * `app/src/routes/`, so the workspace `package.json` is three levels up).
 *
 * If the file is missing or malformed we return `null` rather than
 * throwing — the version is a presentational label, never a hard
 * runtime dependency.
 */
function readAppVersion(): string | null {
  try {
    // ../../../package.json — `app/src/routes/+layout.server.ts` → `<root>/package.json`
    const here = dirname(fileURLToPath(import.meta.url));
    const pkgPath = resolve(here, '../../../package.json');
    const raw = readFileSync(pkgPath, 'utf-8');
    const parsed = JSON.parse(raw) as { version?: unknown };
    return typeof parsed.version === 'string' ? parsed.version : null;
  } catch {
    return null;
  }
}

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
    appVersion: readAppVersion(),
  };
};
