import { describe, it, expect } from 'vitest';
import {
  normalizeDomains,
  normalizeDomain,
  domainStatusTone,
  statusLabel,
  type RawDomain,
} from '$lib/sites/domains.js';

describe('normalizeDomains', () => {
  it('returns a top-level array as-is', () => {
    const result = normalizeDomains([
      { domain: 'example.com', verified: true },
      { domain: 'test.org', verified: false },
    ]);
    expect(result).toHaveLength(2);
  });

  it('unwraps common envelope keys', () => {
    for (const key of ['domains', 'items', 'data', 'results']) {
      const result = normalizeDomains({ [key]: [{ domain: 'example.com' }] });
      expect(result).toHaveLength(1);
      expect(result[0].domain).toBe('example.com');
    }
  });

  it('returns [] for null/undefined/unrecognized shapes', () => {
    expect(normalizeDomains(null)).toEqual([]);
    expect(normalizeDomains(undefined)).toEqual([]);
    expect(normalizeDomains({ total: 0 })).toEqual([]);
    expect(normalizeDomains('nope')).toEqual([]);
  });

  it('normalizes every extracted domain', () => {
    const [domain] = normalizeDomains([{ domain: 'example.com' }]);
    expect(domain.dnsStatus).toBe('pending'); // default
    expect(domain.sslStatus).toBe('pending'); // default
    expect(domain.verified).toBe(false); // default
  });
});

describe('normalizeDomain', () => {
  it('captures numeric id from backend', () => {
    const raw: RawDomain = {
      id: 42,
      domain: 'example.com',
      dnsStatus: 'verified',
      sslStatus: 'verified',
      verified: true,
    };
    const result = normalizeDomain(raw);
    expect(result.id).toBe(42);
    expect(result.domain).toBe('example.com');
  });

  it('maps known fields with camelCase', () => {
    const raw: RawDomain = {
      id: 1,
      domain: 'example.com',
      dnsStatus: 'verified',
      sslStatus: 'verified',
      cname: 'app.netlify.com',
      verified: true,
    };
    const result = normalizeDomain(raw);
    expect(result).toEqual({
      id: 1,
      domain: 'example.com',
      dnsStatus: 'verified',
      sslStatus: 'verified',
      cname: 'app.netlify.com',
      verified: true,
    });
  });

  it('maps webs status values to stable DomainStatus', () => {
    const testCases = [
      { input: 'active', expected: 'verified' },
      { input: 'ssl_issued', expected: 'verified' },
      { input: 'dns_verified', expected: 'verified' },
      { input: 'pending_verification', expected: 'pending' },
      { input: 'ssl_pending', expected: 'pending' },
      { input: 'failed', expected: 'error' },
      { input: 'suspended', expected: 'error' },
    ];

    testCases.forEach(({ input, expected }) => {
      const raw: RawDomain = { id: 1, domain: 'example.com', status: input };
      const result = normalizeDomain(raw);
      expect(result.dnsStatus).toBe(expected);
      expect(result.sslStatus).toBe(expected);
    });
  });

  it('tolerates snake_case and alt keys', () => {
    const raw: RawDomain = {
      id: 2,
      name: 'example.com',
      dns_status: 'pending',
      ssl_status: 'error',
      cname_value: 'app.netlify.com',
      verified: true,
    };
    const result = normalizeDomain(raw);
    expect(result.id).toBe(2);
    expect(result.domain).toBe('example.com');
    expect(result.dnsStatus).toBe('pending');
    expect(result.sslStatus).toBe('error');
    expect(result.cname).toBe('app.netlify.com');
  });

  it('falls back to pending/false for missing status/verified', () => {
    const raw: RawDomain = { id: 3, domain: 'example.com' };
    const result = normalizeDomain(raw);
    expect(result.id).toBe(3);
    expect(result.dnsStatus).toBe('pending');
    expect(result.sslStatus).toBe('pending');
    expect(result.verified).toBe(false);
  });

  it('defaults to undefined for missing cname', () => {
    const raw: RawDomain = { id: 4, domain: 'example.com' };
    const result = normalizeDomain(raw);
    expect(result.cname).toBeUndefined();
  });

  it('normalizes unknown status to pending', () => {
    const raw: RawDomain = {
      id: 5,
      domain: 'example.com',
      dnsStatus: 'unknown-status',
      sslStatus: 'weird',
    };
    const result = normalizeDomain(raw);
    expect(result.dnsStatus).toBe('pending');
    expect(result.sslStatus).toBe('pending');
  });

  it('tolerates empty domain and uses fallback', () => {
    const raw: RawDomain = { id: 6, domain: '', verified: true };
    const result = normalizeDomain(raw);
    expect(result.id).toBe(6);
    expect(result.domain).toBe('');
  });

  it('uses cnameValue as alt key for cname', () => {
    const raw: RawDomain = {
      id: 7,
      domain: 'example.com',
      cnameValue: 'app.example.com',
    };
    const result = normalizeDomain(raw);
    expect(result.id).toBe(7);
    expect(result.cname).toBe('app.example.com');
  });

  it('prefers explicit dnsStatus/sslStatus over single status field', () => {
    const raw: RawDomain = {
      id: 8,
      domain: 'example.com',
      status: 'active', // webs sends this
      dnsStatus: 'error', // but also send explicit status
      sslStatus: 'error',
    };
    const result = normalizeDomain(raw);
    expect(result.dnsStatus).toBe('error');
    expect(result.sslStatus).toBe('error');
  });
});

describe('domainStatusTone', () => {
  it('maps verified to ok', () => {
    expect(domainStatusTone('verified')).toBe('ok');
  });

  it('maps pending to pending', () => {
    expect(domainStatusTone('pending')).toBe('pending');
  });

  it('maps error to error', () => {
    expect(domainStatusTone('error')).toBe('error');
  });

  it('defaults unknown to error', () => {
    // @ts-expect-error testing invalid input
    expect(domainStatusTone('unknown')).toBe('error');
  });
});

describe('statusLabel', () => {
  it('capitalizes the status', () => {
    expect(statusLabel('verified')).toBe('Verified');
    expect(statusLabel('pending')).toBe('Pending');
    expect(statusLabel('error')).toBe('Error');
  });
});
