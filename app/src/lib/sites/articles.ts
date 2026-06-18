// Generic "articles" CMS module for Site adapters (HIAI_ADMIN_INTEGRATION_PLAN Block B / B1).
// Pure, framework-agnostic logic shared by the article list + editor pages. The site
// backend contract is intentionally loose: we normalize whatever shape a tenant backend
// returns (camelCase, snake_case, common alt keys) into a stable `Article`. No webs-specifics
// live here — webs is just one tenant whose adapter enables the `articles` module.

export const STATUS_OPTIONS = ['draft', 'published', 'archived'] as const;
export type ArticleStatus = (typeof STATUS_OPTIONS)[number];

export interface Article {
  id: string;
  title: string;
  status: ArticleStatus;
  language: string;
  slug: string;
  updatedAt: string;
  content: string;
}

/** Loosely-typed row as delivered by an arbitrary site backend. */
export type RawArticle = Record<string, unknown>;

function isStatus(v: unknown): v is ArticleStatus {
  return typeof v === 'string' && (STATUS_OPTIONS as readonly string[]).includes(v);
}

function firstString(row: RawArticle, keys: string[], fallback = ''): string {
  for (const k of keys) {
    const v = row[k];
    if (typeof v === 'string' && v !== '') return v;
    if (typeof v === 'number') return String(v);
  }
  return fallback;
}

/** Map an arbitrary backend row into a stable {@link Article}, applying safe fallbacks. */
export function normalizeArticle(raw: RawArticle): Article {
  const statusRaw = raw.status;
  return {
    id: firstString(raw, ['id', '_id', 'uuid'], ''),
    title: firstString(raw, ['title', 'name', 'headline'], 'Untitled'),
    status: isStatus(statusRaw) ? statusRaw : 'draft',
    language: firstString(raw, ['language', 'lang', 'locale'], 'en'),
    slug: firstString(raw, ['slug', 'path'], ''),
    updatedAt: firstString(raw, ['updatedAt', 'updated_at', 'modifiedAt', 'createdAt'], ''),
    content: firstString(raw, ['content', 'body', 'markdown', 'md'], ''),
  };
}

const ENVELOPE_KEYS = ['items', 'data', 'articles', 'results', 'posts'];

/** Unwrap a list response (array or common envelope) and normalize each row. */
export function extractArticles(payload: unknown): Article[] {
  let rows: unknown;
  if (Array.isArray(payload)) {
    rows = payload;
  } else if (payload && typeof payload === 'object') {
    const obj = payload as Record<string, unknown>;
    for (const key of ENVELOPE_KEYS) {
      if (Array.isArray(obj[key])) {
        rows = obj[key];
        break;
      }
    }
  }
  if (!Array.isArray(rows)) return [];
  return rows.filter((r): r is RawArticle => !!r && typeof r === 'object').map(normalizeArticle);
}

export function statusLabel(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export interface BulkStatusBody {
  ids: string[];
  status: ArticleStatus;
}

/** Build (and validate) the payload for `POST /articles/bulk-status`. */
export function buildBulkStatusBody(ids: string[], status: string): BulkStatusBody {
  if (ids.length === 0) throw new Error('No articles selected');
  if (!isStatus(status)) throw new Error(`Invalid status: ${status}`);
  return { ids, status };
}

export interface ArticleDraft {
  title?: string;
  status?: string;
  content?: string;
}

export type ValidationResult = { ok: true } | { ok: false; error: string };

/** Guard a save/publish: a title is always required; publishing additionally needs content. */
export function validateArticleDraft(draft: ArticleDraft): ValidationResult {
  if (!draft.title || draft.title.trim() === '') {
    return { ok: false, error: 'Title is required' };
  }
  if (draft.status === 'published' && (!draft.content || draft.content.trim() === '')) {
    return { ok: false, error: 'Cannot publish an empty article' };
  }
  return { ok: true };
}
