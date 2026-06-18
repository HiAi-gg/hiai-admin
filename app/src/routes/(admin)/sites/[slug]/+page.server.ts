import { env as publicEnv } from '$env/dynamic/public';
import type { PageServerLoad } from './$types';
import { siteAdapterService } from '../../../../../../backend/src/modules/site-adapter/site-adapter.service.js';
import { extractArticles, type Article } from '$lib/sites/articles.js';
import { normalizeDomains, type DomainRecord } from '$lib/sites/domains.js';

export interface SiteAdapterRow {
  slug: string;
  name: string;
  backendUrl: string;
  modules: string[];
  enabled?: boolean;
  tenantId: string;
}

export interface SiteSettings {
  name: string;
  slug: string;
  description: string;
  status: string;
  theme: string;
  domain: string;
}

export type DomainSummary =
  | { state: 'none' }
  | { state: 'pending' }
  | { state: 'verified'; count: number }
  | { state: 'error'; count: number };

// Site dashboard. Loads the adapter, the site settings (used for display + the public URL
// derivation), and best-effort counts/samples for articles, homepage blocks, and domains.
// All remote reads are tolerant: a backend that is down, missing, or returns an unexpected
// shape must not break the dashboard. The page itself is read-only display + navigation;
// settings editing lives on `/sites/[slug]/edit` (handled by a sibling route).
export const load: PageServerLoad = async ({ params, fetch }) => {
  const { slug } = params;
  let adapter: SiteAdapterRow | null = null;
  let settings: SiteSettings = {
    name: '',
    slug,
    description: '',
    status: 'active',
    theme: 'default',
    domain: '',
  };
  let error: string | undefined;

  // Load site adapter from the in-process list (same pattern as the layout/sites page).
  try {
    const dtos = await siteAdapterService.list();
    const adapters = dtos.map((dto: { tenantId: string; slug: string; name: string; backendUrl: string; modules: string[]; enabled?: boolean }) => ({
      tenantId: dto.tenantId,
      slug: dto.slug,
      name: dto.name,
      backendUrl: dto.backendUrl,
      modules: dto.modules,
      enabled: dto.enabled,
    }));
    adapter = adapters.find((a) => a.slug === slug) || null;
    if (!adapter) error = 'Site not found';
  } catch (e) {
    error = e instanceof Error ? e.message : 'Failed to load site adapter';
  }

  // Load site settings (best-effort). Extracts the fields the dashboard actually needs.
  if (adapter && !error) {
    try {
      const res = await fetch(`/api/${slug}/sites/${slug}`);
      if (res.ok) {
        const body = await res.json();
        const site = body && typeof body === 'object' && !Array.isArray(body) && (body as { site?: unknown }).site
          ? (body as { site: Record<string, unknown> }).site
          : body;
        if (site && typeof site === 'object') {
          const s = site as Record<string, unknown>;
          settings = {
            name: typeof s.name === 'string' ? s.name : adapter.name,
            slug: typeof s.slug === 'string' ? s.slug : slug,
            description: typeof s.description === 'string' ? s.description : '',
            status: typeof s.status === 'string' ? s.status : 'active',
            theme: typeof s.theme === 'string' ? s.theme : 'default',
            domain: typeof s.domain === 'string' ? s.domain : '',
          };
        }
      }
    } catch {
      // Ignore; settings are optional.
    }
  }

  // Derive the public URL the visitor-facing site lives at. Used by the "View site" button.
  // Order: explicit custom domain → PUBLIC_SITE_BASE_URL + slug → none.
  const publicUrl = computePublicUrl(settings.domain, slug);

  // Best-effort counts + samples. Each fetch is isolated so a single failure can't break the others.
  const blocksCount = await safeCount(fetch, `/api/${slug}/homepage-blocks/admin/site-by-slug/${slug}`);
  const domainStatus = await safeDomainStatus(fetch, `/api/${slug}/domains?site=${encodeURIComponent(slug)}`);
  const articlesPayload = await safeJson(fetch, `/api/${slug}/articles/admin/list?site=${encodeURIComponent(slug)}`);
  const recentArticles = articlesPayload ? pickRecentArticles(articlesPayload) : [];
  const articlesCount = articlesPayload ? countFromPayload(articlesPayload) ?? recentArticles.length : null;

  return {
    slug,
    adapter,
    settings,
    publicUrl,
    error,
    articlesCount,
    blocksCount,
    domainStatus,
    recentArticles,
  };
};

function computePublicUrl(domain: string, slug: string): string | null {
  if (domain) return `https://${domain}`;
  const base = publicEnv.PUBLIC_SITE_BASE_URL;
  if (base) return `${base.replace(/\/$/, '')}/${slug}`;
  return null;
}

async function safeJson(fetchFn: typeof globalThis.fetch, url: string): Promise<unknown> {
  try {
    const res = await fetchFn(url);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function safeCount(fetchFn: typeof globalThis.fetch, url: string): Promise<number | null> {
  const body = await safeJson(fetchFn, url);
  return countFromPayload(body);
}

function countFromPayload(body: unknown): number | null {
  if (body == null) return null;
  if (typeof body === 'number') return body;
  if (Array.isArray(body)) return body.length;
  if (body && typeof body === 'object') {
    const obj = body as Record<string, unknown>;
    for (const key of ['articles', 'blocks', 'items', 'data', 'results']) {
      if (Array.isArray(obj[key])) return (obj[key] as unknown[]).length;
    }
    // Some endpoints expose a direct `count` (e.g. drafts/count).
    if (typeof obj.count === 'number') return obj.count;
    if (typeof obj.draftCount === 'number') return obj.draftCount;
    // Pagination envelopes (webs: { articles, pagination: { total } }).
    const pagination = obj.pagination as { total?: unknown } | undefined;
    if (pagination && typeof pagination.total === 'number') return pagination.total;
  }
  return null;
}

async function safeDomainStatus(fetchFn: typeof globalThis.fetch, url: string): Promise<DomainSummary> {
  try {
    const res = await fetchFn(url);
    if (!res.ok) return { state: 'none' };
    const body = await res.json();
    const domains: DomainRecord[] = normalizeDomains(body);
    if (domains.length === 0) return { state: 'none' };
    const errorCount = domains.filter((d) => d.dnsStatus === 'error' || d.sslStatus === 'error').length;
    if (errorCount > 0) return { state: 'error', count: errorCount };
    const verifiedCount = domains.filter((d) => d.verified).length;
    if (verifiedCount > 0) return { state: 'verified', count: verifiedCount };
    return { state: 'pending' };
  } catch {
    return { state: 'none' };
  }
}

function pickRecentArticles(body: unknown): Article[] {
  const articles = extractArticles(body);
  // Sort by updatedAt desc when present, then slice to the most recent 5.
  return [...articles]
    .sort((a, b) => {
      const ta = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const tb = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      return tb - ta;
    })
    .slice(0, 5);
}
