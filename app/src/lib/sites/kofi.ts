// Generic "ko-fi" donations module for Site adapters (HIAI_ADMIN_INTEGRATION_PLAN Block B / B3).
// Pure, framework-agnostic logic shared by the ko-fi config + donations pages. The site
// backend contract is intentionally loose: we normalize whatever shape a tenant backend
// returns (camelCase, snake_case, common alt keys) into stable `KofiConfig` and `Donation` types.
// No webs-specifics live here — webs is just one tenant whose adapter enables the `kofi` module.

export interface KofiConfig {
  webhookUrl: string;
  verificationToken: string;
  enabled: boolean;
}

/** Loosely-typed row as delivered by an arbitrary site backend. */
export type RawConfig = Record<string, unknown>;

function firstString(obj: RawConfig, keys: string[], fallback = ''): string {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === 'string' && v !== '') return v;
    if (typeof v === 'number') return String(v);
  }
  return fallback;
}

function isBoolean(v: unknown): v is boolean {
  return typeof v === 'boolean';
}

/** Map an arbitrary backend config into a stable {@link KofiConfig}, applying safe fallbacks.
 *  Handles webs schema (kofi_enabled, kofi_url) and other common alternatives.
 */
export function normalizeKofiConfig(payload: unknown): KofiConfig {
  if (!payload || typeof payload !== 'object') {
    return { webhookUrl: '', verificationToken: '', enabled: false };
  }

  const obj = payload as RawConfig;
  const enabled = isBoolean(obj.kofi_enabled)
    ? obj.kofi_enabled
    : isBoolean(obj.enabled)
      ? obj.enabled
      : false;

  return {
    webhookUrl: firstString(obj, ['kofi_url', 'webhookUrl', 'webhook_url', 'webhook', 'url'], ''),
    verificationToken: firstString(obj, ['verificationToken', 'verification_token', 'token'], ''),
    enabled,
  };
}

export type ValidationResult = { ok: true } | { ok: false; error: string };

/** Validate a Ko-fi config: if enabled, webhookUrl must be a valid http(s) URL and token non-empty. */
export function validateKofiConfig(cfg: KofiConfig): ValidationResult {
  if (!cfg.enabled) {
    return { ok: true };
  }

  // If enabled, both fields are required.
  if (!cfg.webhookUrl || cfg.webhookUrl.trim() === '') {
    return { ok: false, error: 'Webhook URL is required when enabled' };
  }

  if (!cfg.verificationToken || cfg.verificationToken.trim() === '') {
    return { ok: false, error: 'Verification token is required when enabled' };
  }

  // Validate URL format (simple check for http/https).
  if (!cfg.webhookUrl.startsWith('http://') && !cfg.webhookUrl.startsWith('https://')) {
    return { ok: false, error: 'Webhook URL must start with http:// or https://' };
  }

  return { ok: true };
}

export interface Donation {
  id: string;
  from: string;
  amount: string;
  currency: string;
  message: string;
  createdAt: string;
}

/** Loosely-typed donation row as delivered by an arbitrary site backend. */
export type RawDonation = Record<string, unknown>;

/** Map an arbitrary backend donation row into a stable {@link Donation}, applying safe fallbacks. */
function normalizeDonation(raw: RawDonation): Donation {
  return {
    id: firstString(raw, ['id', '_id', 'uuid'], ''),
    from: firstString(
      raw,
      ['from', 'from_name', 'donor', 'donerName', 'donor_name', 'name'],
      'Anonymous',
    ),
    amount: firstString(raw, ['amount', 'value', 'sum'], '0.00'),
    currency: firstString(raw, ['currency', 'currencyCode', 'currency_code'], 'USD'),
    message: firstString(raw, ['message', 'note', 'text', 'comment'], ''),
    createdAt: firstString(
      raw,
      ['createdAt', 'created_at', 'donatedAt', 'donated_at', 'timestamp', 'date'],
      '',
    ),
  };
}

const ENVELOPE_KEYS = ['items', 'data', 'donations', 'results', 'contributions'];

/** Unwrap a list response (array or common envelope) and normalize each donation, sorted by createdAt descending. */
export function extractDonations(payload: unknown): Donation[] {
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

  const donations = rows
    .filter((r): r is RawDonation => !!r && typeof r === 'object')
    .map(normalizeDonation);

  // Sort by createdAt descending (newest first).
  return donations.sort((a, b) => {
    const aTime = new Date(a.createdAt).getTime();
    const bTime = new Date(b.createdAt).getTime();
    return bTime - aTime;
  });
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  CNY: '¥',
  INR: '₹',
  AUD: 'A$',
  CAD: 'C$',
  CHF: 'CHF',
  SEK: 'kr',
  NOK: 'kr',
  DKK: 'kr',
};

/** Format a donation amount with currency symbol, e.g. "$5.00" or "€10.50" or "CHF100.00". */
export function formatAmount(d: Donation): string {
  const symbol = CURRENCY_SYMBOLS[d.currency] || d.currency;
  // If symbol is a code (len > 1), use prefix; else use symbol as prefix/suffix.
  if (symbol.length > 1) {
    return `${symbol} ${d.amount}`;
  }
  return `${symbol}${d.amount}`;
}
