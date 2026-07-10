import { describe, it, expect } from 'vitest';
import { createHmac } from 'node:crypto';
import { mintBackendToken } from '../../src/lib/server/backend-token.js';

const SECRET = 'shared-with-the-site-backend';
const NOW = 1_700_000_000_000; // fixed epoch ms

function decode(part: string): Record<string, unknown> {
  return JSON.parse(Buffer.from(part, 'base64url').toString('utf8'));
}

describe('mintBackendToken', () => {
  it('produces a 3-part HS256 JWT with the expected header', () => {
    const token = mintBackendToken({ userId: 'u1', email: 'a@b.c', role: 'admin' }, SECRET);
    const parts = token.split('.');
    expect(parts).toHaveLength(3);
    expect(decode(parts[0])).toEqual({ alg: 'HS256' });
  });

  it('carries sub/email/role and iat/exp (exp = iat + 1h by default)', () => {
    const token = mintBackendToken({ userId: 'u1', email: 'a@b.c', role: 'admin' }, SECRET, {
      now: NOW,
    });
    const payload = decode(token.split('.')[1]);
    const iat = Math.floor(NOW / 1000);
    expect(payload).toMatchObject({
      sub: 'u1',
      email: 'a@b.c',
      role: 'admin',
      iat,
      exp: iat + 3600,
    });
  });

  it('honors a custom expiry', () => {
    const token = mintBackendToken({ userId: 'u1', email: 'a@b.c', role: 'admin' }, SECRET, {
      now: NOW,
      expiresInSec: 60,
    });
    const payload = decode(token.split('.')[1]);
    expect(payload.exp).toBe(Math.floor(NOW / 1000) + 60);
  });

  describe('role mapping (consumer adapter roles)', () => {
    it.each([
      ['super_admin', 'super_admin'],
      ['admin', 'admin'],
      ['site_admin', 'editor'],
      ['staff', 'staff'], // unknown → passthrough
    ])('maps %s → %s', (input, expected) => {
      const token = mintBackendToken({ userId: 'u1', email: 'a@b.c', role: input }, SECRET);
      expect(decode(token.split('.')[1]).role).toBe(expected);
    });
  });

  it('signs with the secret (signature verifies, and a wrong secret does not)', () => {
    const token = mintBackendToken({ userId: 'u1', email: 'a@b.c', role: 'admin' }, SECRET, {
      now: NOW,
    });
    const [h, p, sig] = token.split('.');
    const expected = createHmac('sha256', SECRET).update(`${h}.${p}`).digest('base64url');
    expect(sig).toBe(expected);

    const wrong = createHmac('sha256', 'other-secret').update(`${h}.${p}`).digest('base64url');
    expect(sig).not.toBe(wrong);
  });

  it('is deterministic for a fixed clock', () => {
    const a = mintBackendToken({ userId: 'u1', email: 'a@b.c', role: 'admin' }, SECRET, {
      now: NOW,
    });
    const b = mintBackendToken({ userId: 'u1', email: 'a@b.c', role: 'admin' }, SECRET, {
      now: NOW,
    });
    expect(a).toBe(b);
  });

  it('throws when the secret is empty', () => {
    expect(() => mintBackendToken({ userId: 'u1', email: 'a@b.c', role: 'admin' }, '')).toThrow();
  });
});
