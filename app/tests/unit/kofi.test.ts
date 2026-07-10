import { describe, it, expect } from 'vitest';
import {
  extractDonations,
  normalizeKofiConfig,
  validateKofiConfig,
  formatAmount,
  type RawDonation,
  type KofiConfig,
  type Donation,
} from '$lib/sites/kofi.js';

describe('normalizeKofiConfig', () => {
  it('normalizes snake_case schema (kofi_enabled, kofi_url)', () => {
    const raw = {
      kofi_enabled: true,
      kofi_url: 'https://example.com/webhook',
    };
    const cfg = normalizeKofiConfig(raw);
    expect(cfg.enabled).toBe(true);
    expect(cfg.webhookUrl).toBe('https://example.com/webhook');
    expect(cfg.verificationToken).toBe('');
  });

  it('normalizes a complete camelCase config', () => {
    const raw = {
      webhookUrl: 'https://example.com/webhook',
      verificationToken: 'secret123',
      enabled: true,
    };
    const cfg = normalizeKofiConfig(raw);
    expect(cfg).toEqual({
      webhookUrl: 'https://example.com/webhook',
      verificationToken: 'secret123',
      enabled: true,
    });
  });

  it('tolerates snake_case keys', () => {
    const raw = {
      webhook_url: 'https://example.com/webhook',
      verification_token: 'secret123',
      enabled: true,
    };
    const cfg = normalizeKofiConfig(raw);
    expect(cfg.webhookUrl).toBe('https://example.com/webhook');
    expect(cfg.verificationToken).toBe('secret123');
    expect(cfg.enabled).toBe(true);
  });

  it('tolerates alt keys (webhook, token, url)', () => {
    const cfg1 = normalizeKofiConfig({ webhook: 'https://ex.com', token: 'tk', enabled: true });
    expect(cfg1.webhookUrl).toBe('https://ex.com');
    expect(cfg1.verificationToken).toBe('tk');

    const cfg2 = normalizeKofiConfig({ url: 'https://ex.com', enabled: false });
    expect(cfg2.webhookUrl).toBe('https://ex.com');
  });

  it('applies fallbacks for missing fields', () => {
    const cfg = normalizeKofiConfig({ enabled: false });
    expect(cfg).toEqual({
      webhookUrl: '',
      verificationToken: '',
      enabled: false,
    });
  });

  it('defaults to false/empty on null or undefined', () => {
    expect(normalizeKofiConfig(null)).toEqual({
      webhookUrl: '',
      verificationToken: '',
      enabled: false,
    });
    expect(normalizeKofiConfig(undefined)).toEqual({
      webhookUrl: '',
      verificationToken: '',
      enabled: false,
    });
  });

  it('coerces numeric values to strings', () => {
    const cfg = normalizeKofiConfig({ webhookUrl: 123, verificationToken: 456, enabled: true });
    expect(cfg.webhookUrl).toBe('123');
    expect(cfg.verificationToken).toBe('456');
  });

  it('ignores empty strings and prioritizes non-empty values', () => {
    const cfg = normalizeKofiConfig({
      webhookUrl: '',
      webhook_url: 'https://fallback.com',
      enabled: false,
    });
    expect(cfg.webhookUrl).toBe('https://fallback.com');
  });

  it('prioritizes kofi_url over other url variants', () => {
    const cfg = normalizeKofiConfig({
      kofi_url: 'https://example.com/webhook',
      webhookUrl: 'https://old.com/webhook',
      webhook_url: 'https://fallback.com/webhook',
    });
    expect(cfg.webhookUrl).toBe('https://example.com/webhook');
  });
});

describe('validateKofiConfig', () => {
  it('accepts a valid enabled config with both fields', () => {
    const cfg: KofiConfig = {
      webhookUrl: 'https://example.com/webhook',
      verificationToken: 'secret123',
      enabled: true,
    };
    expect(validateKofiConfig(cfg)).toEqual({ ok: true });
  });

  it('accepts a disabled config with empty fields', () => {
    const cfg: KofiConfig = {
      webhookUrl: '',
      verificationToken: '',
      enabled: false,
    };
    expect(validateKofiConfig(cfg)).toEqual({ ok: true });
  });

  it('rejects enabled config without webhookUrl', () => {
    const cfg: KofiConfig = {
      webhookUrl: '',
      verificationToken: 'secret123',
      enabled: true,
    };
    const result = validateKofiConfig(cfg);
    expect(result.ok).toBe(false);
    expect((result as any).error).toContain('Webhook URL');
  });

  it('rejects enabled config without verificationToken', () => {
    const cfg: KofiConfig = {
      webhookUrl: 'https://example.com/webhook',
      verificationToken: '',
      enabled: true,
    };
    const result = validateKofiConfig(cfg);
    expect(result.ok).toBe(false);
    expect((result as any).error).toContain('Verification token');
  });

  it('rejects webhookUrl without http/https scheme', () => {
    const cfg: KofiConfig = {
      webhookUrl: 'example.com/webhook',
      verificationToken: 'secret123',
      enabled: true,
    };
    const result = validateKofiConfig(cfg);
    expect(result.ok).toBe(false);
    expect((result as any).error).toContain('http:// or https://');
  });

  it('accepts http (not just https)', () => {
    const cfg: KofiConfig = {
      webhookUrl: 'http://example.com/webhook',
      verificationToken: 'secret123',
      enabled: true,
    };
    expect(validateKofiConfig(cfg)).toEqual({ ok: true });
  });

  it('rejects whitespace-only verificationToken when enabled', () => {
    const cfg: KofiConfig = {
      webhookUrl: 'https://example.com/webhook',
      verificationToken: '   ',
      enabled: true,
    };
    const result = validateKofiConfig(cfg);
    expect(result.ok).toBe(false);
  });
});

describe('extractDonations', () => {
  it('returns a top-level array as-is', () => {
    const payload = [{ id: '1' }, { id: '2' }];
    expect(extractDonations(payload)).toHaveLength(2);
  });

  it('unwraps the common envelope keys', () => {
    for (const key of ['items', 'data', 'donations', 'results', 'contributions']) {
      const payload = { [key]: [{ id: 'x' }] };
      const result = extractDonations(payload);
      expect(result).toHaveLength(1);
    }
  });

  it('returns [] for null/undefined/unrecognized shapes', () => {
    expect(extractDonations(null)).toEqual([]);
    expect(extractDonations(undefined)).toEqual([]);
    expect(extractDonations({ total: 0 })).toEqual([]);
    expect(extractDonations('nope')).toEqual([]);
  });

  it('normalizes every extracted donation', () => {
    const [d] = extractDonations([
      { id: '1', from: 'Alice', amount: '10.00', currency: 'USD', createdAt: '2026-06-16' },
    ]);
    expect(d.from).toBe('Alice');
    expect(d.amount).toBe('10.00');
  });

  it('sorts donations by createdAt descending (newest first)', () => {
    const payload = [
      { id: '1', createdAt: '2026-01-01' },
      { id: '2', createdAt: '2026-06-16' },
      { id: '3', createdAt: '2026-03-01' },
    ];
    const result = extractDonations(payload);
    expect(result[0].id).toBe('2'); // newest
    expect(result[1].id).toBe('3');
    expect(result[2].id).toBe('1'); // oldest
  });

  it('handles missing createdAt gracefully in sorting', () => {
    const payload = [
      { id: '1', createdAt: '2026-06-16' },
      { id: '2', createdAt: '' },
      { id: '3', createdAt: '2026-03-01' },
    ];
    const result = extractDonations(payload);
    // Empty date becomes NaN timestamp (treated as 0 in sort), ends up in the middle
    expect(result[0].id).toBe('1'); // 2026-06-16
    expect(result.length).toBe(3); // all donations preserved
  });
});

describe('normalizeDonation (internal / via extractDonations)', () => {
  function getDonation(raw: RawDonation): Donation {
    return extractDonations([raw])[0];
  }

  it('maps all standard fields', () => {
    const d = getDonation({
      id: '123',
      from: 'Alice',
      amount: '25.00',
      currency: 'EUR',
      message: 'Great work!',
      createdAt: '2026-06-16T10:00:00Z',
    });
    expect(d).toEqual({
      id: '123',
      from: 'Alice',
      amount: '25.00',
      currency: 'EUR',
      message: 'Great work!',
      createdAt: '2026-06-16T10:00:00Z',
    });
  });

  it('tolerates snake_case and alt keys', () => {
    const d = getDonation({
      id: '123',
      from_name: 'Bob',
      value: '50.00',
      currency_code: 'GBP',
      note: 'Thanks!',
      created_at: '2026-06-15',
    });
    expect(d.from).toBe('Bob');
    expect(d.amount).toBe('50.00');
    expect(d.currency).toBe('GBP');
    expect(d.message).toBe('Thanks!');
    expect(d.createdAt).toBe('2026-06-15');
  });

  it('falls back to "Anonymous" for missing from', () => {
    const d = getDonation({ id: '1' });
    expect(d.from).toBe('Anonymous');
  });

  it('falls back to "0.00" for missing amount', () => {
    const d = getDonation({ id: '1' });
    expect(d.amount).toBe('0.00');
  });

  it('falls back to "USD" for missing currency', () => {
    const d = getDonation({ id: '1' });
    expect(d.currency).toBe('USD');
  });

  it('falls back to empty string for missing message', () => {
    const d = getDonation({ id: '1' });
    expect(d.message).toBe('');
  });

  it('coerces numeric id to string', () => {
    const d = getDonation({ id: 999, from: 'Test' });
    expect(d.id).toBe('999');
  });

  it('allows numeric amount/currency fallback', () => {
    const d = getDonation({ id: '1', amount: 123, currency: 456 });
    expect(d.amount).toBe('123');
    expect(d.currency).toBe('456');
  });
});

describe('formatAmount', () => {
  it('formats USD with $ prefix', () => {
    const d: Donation = {
      id: '1',
      from: 'Alice',
      amount: '5.00',
      currency: 'USD',
      message: '',
      createdAt: '',
    };
    expect(formatAmount(d)).toBe('$5.00');
  });

  it('formats EUR with € prefix', () => {
    const d: Donation = {
      id: '1',
      from: 'Alice',
      amount: '10.50',
      currency: 'EUR',
      message: '',
      createdAt: '',
    };
    expect(formatAmount(d)).toBe('€10.50');
  });

  it('formats GBP with £ prefix', () => {
    const d: Donation = {
      id: '1',
      from: 'Alice',
      amount: '20.00',
      currency: 'GBP',
      message: '',
      createdAt: '',
    };
    expect(formatAmount(d)).toBe('£20.00');
  });

  it('formats unknown currency with code prefix', () => {
    const d: Donation = {
      id: '1',
      from: 'Alice',
      amount: '100.00',
      currency: 'XYZ',
      message: '',
      createdAt: '',
    };
    expect(formatAmount(d)).toBe('XYZ 100.00');
  });

  it('handles JPY (¥) symbol', () => {
    const d: Donation = {
      id: '1',
      from: 'Alice',
      amount: '1000',
      currency: 'JPY',
      message: '',
      createdAt: '',
    };
    expect(formatAmount(d)).toBe('¥1000');
  });

  it('handles multi-char currency codes (CHF, AUD, CAD, etc.)', () => {
    const ausd: Donation = {
      id: '1',
      from: 'Alice',
      amount: '15.00',
      currency: 'AUD',
      message: '',
      createdAt: '',
    };
    expect(formatAmount(ausd)).toBe('A$ 15.00');

    const chf: Donation = {
      id: '1',
      from: 'Alice',
      amount: '25.00',
      currency: 'CHF',
      message: '',
      createdAt: '',
    };
    expect(formatAmount(chf)).toBe('CHF 25.00');
  });
});
