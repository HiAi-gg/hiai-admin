// Generic "domains" CMS module for Site adapters (HIAI_ADMIN_INTEGRATION_PLAN Block B / B2.4).
// Pure, framework-agnostic logic for managing domain configurations (DNS, CNAME, SSL).
// The site backend contract is loose; normalizeDomains normalizes whatever shape a tenant
// backend returns into a stable DomainRecord[].

export type DomainStatus = 'verified' | 'pending' | 'error';

export interface DomainRecord {
  id?: number; // Numeric domain ID from backend (required for verify/delete operations)
  domain: string;
  dnsStatus: DomainStatus;
  sslStatus: DomainStatus;
  cname?: string;
  verified: boolean;
}

/** Loosely-typed domain row as delivered by an arbitrary site backend. */
export type RawDomain = Record<string, unknown>;

function isStatus(v: unknown): v is DomainStatus {
  return typeof v === 'string' && ['verified', 'pending', 'error'].includes(v);
}

function firstString(row: RawDomain, keys: string[], fallback = ''): string {
  for (const k of keys) {
    const v = row[k];
    if (typeof v === 'string' && v !== '') return v;
  }
  return fallback;
}

/** Map common provider lifecycle values to the canonical domain status. */
function mapLifecycleStatus(status: unknown): DomainStatus {
  if (typeof status !== 'string') return 'pending';

  if (status === 'active' || status === 'ssl_issued' || status === 'dns_verified') {
    return 'verified';
  }
  if (status === 'pending_verification' || status === 'ssl_pending') {
    return 'pending';
  }
  if (status === 'failed' || status === 'suspended') {
    return 'error';
  }
  return 'pending'; // fallback
}

/**
 * Map an arbitrary backend domain row into a stable {@link DomainRecord},
 * applying safe fallbacks for status fields.
 * Handles both canonical fields and common provider lifecycle values.
 */
export function normalizeDomain(raw: RawDomain): DomainRecord {
  const id = typeof raw.id === 'number' ? raw.id : undefined;

  const lifecycleStatus = raw.status;
  let dnsStatusRaw = raw.dnsStatus || raw.dns_status;
  let sslStatusRaw = raw.sslStatus || raw.ssl_status;

  if (lifecycleStatus && !dnsStatusRaw && !sslStatusRaw) {
    const mapped = mapLifecycleStatus(lifecycleStatus);
    dnsStatusRaw = mapped;
    sslStatusRaw = mapped;
  }

  return {
    id,
    domain: firstString(raw, ['domain', 'name', 'host'], ''),
    dnsStatus: isStatus(dnsStatusRaw) ? dnsStatusRaw : 'pending',
    sslStatus: isStatus(sslStatusRaw) ? sslStatusRaw : 'pending',
    cname: firstString(raw, ['cname', 'cnameValue', 'cname_value'], undefined) || undefined,
    verified: !!raw.verified,
  };
}

const ENVELOPE_KEYS = ['domains', 'items', 'data', 'results'];

/**
 * Unwrap a list response (array or common envelope) and normalize each domain row.
 */
export function normalizeDomains(payload: unknown): DomainRecord[] {
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

  return rows.filter((r): r is RawDomain => !!r && typeof r === 'object').map(normalizeDomain);
}

/**
 * Map a DomainStatus to a display tone (for UI badge coloring).
 * - 'verified': ok (green)
 * - 'pending': pending (amber)
 * - 'error': error (red)
 */
export function domainStatusTone(status: DomainStatus): 'ok' | 'pending' | 'error' {
  switch (status) {
    case 'verified':
      return 'ok';
    case 'pending':
      return 'pending';
    case 'error':
      return 'error';
    default:
      return 'error';
  }
}

/**
 * Format a domain status label for display.
 */
export function statusLabel(status: DomainStatus): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}
