import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { encrypt, decrypt } from '../../src/lib/encryption.js';

const TEST_SECRET = 'unit-test-secret-min-32-characters-long-okay';

describe('encryption utilities', () => {
  beforeEach(() => {
    process.env.TOKEN_ENCRYPTION_KEY = TEST_SECRET;
    delete process.env.BETTER_AUTH_SECRET;
  });

  afterEach(() => {
    delete process.env.TOKEN_ENCRYPTION_KEY;
  });

  describe('round-trip', () => {
    it('decrypts back to the original plaintext', () => {
      const plaintext = 'hello world';
      const ciphertext = encrypt(plaintext);
      expect(decrypt(ciphertext)).toBe(plaintext);
    });

    it('handles empty strings', () => {
      const ciphertext = encrypt('');
      expect(decrypt(ciphertext)).toBe('');
    });

    it('handles unicode and multi-byte characters', () => {
      const plaintext = 'こんにちは 🌍 — café résumé naïve';
      const ciphertext = encrypt(plaintext);
      expect(decrypt(ciphertext)).toBe(plaintext);
    });

    it('handles long strings (10kB)', () => {
      const plaintext = 'a'.repeat(10_000);
      const ciphertext = encrypt(plaintext);
      expect(decrypt(ciphertext)).toBe(plaintext);
    });

    it('handles strings containing JSON payloads', () => {
      const plaintext = JSON.stringify({ userId: 'u_123', scopes: ['read', 'write'] });
      const ciphertext = encrypt(plaintext);
      expect(JSON.parse(decrypt(ciphertext))).toEqual({
        userId: 'u_123',
        scopes: ['read', 'write'],
      });
    });
  });

  describe('ciphertext properties', () => {
    it('returns base64-encoded output', () => {
      const ciphertext = encrypt('test');
      // base64 alphabet: A-Z, a-z, 0-9, +, /, =
      expect(ciphertext).toMatch(/^[A-Za-z0-9+/=]+$/);
    });

    it('produces different ciphertexts for the same plaintext (random IV)', () => {
      const plaintext = 'same input';
      const a = encrypt(plaintext);
      const b = encrypt(plaintext);
      const c = encrypt(plaintext);
      expect(a).not.toBe(b);
      expect(b).not.toBe(c);
      expect(a).not.toBe(c);
    });

    it('still decrypts to the same plaintext even when ciphertexts differ', () => {
      const plaintext = 'same input';
      expect(decrypt(encrypt(plaintext))).toBe(plaintext);
      expect(decrypt(encrypt(plaintext))).toBe(plaintext);
    });
  });

  describe('key handling', () => {
    it('falls back to BETTER_AUTH_SECRET when TOKEN_ENCRYPTION_KEY is not set', () => {
      delete process.env.TOKEN_ENCRYPTION_KEY;
      process.env.BETTER_AUTH_SECRET = TEST_SECRET;
      const plaintext = 'fallback key test';
      const ciphertext = encrypt(plaintext);
      expect(decrypt(ciphertext)).toBe(plaintext);
    });

    it('throws when neither TOKEN_ENCRYPTION_KEY nor BETTER_AUTH_SECRET is set', () => {
      delete process.env.TOKEN_ENCRYPTION_KEY;
      delete process.env.BETTER_AUTH_SECRET;
      expect(() => encrypt('test')).toThrow(
        'TOKEN_ENCRYPTION_KEY or BETTER_AUTH_SECRET must be set',
      );
    });

    it('throws when decrypting with no key configured', () => {
      const ciphertext = encrypt('test');
      delete process.env.TOKEN_ENCRYPTION_KEY;
      delete process.env.BETTER_AUTH_SECRET;
      expect(() => decrypt(ciphertext)).toThrow();
    });

    it('uses SHA-256 derived 32-byte key (works with arbitrary-length secrets)', () => {
      // SHA-256 always produces a 32-byte key, so the AES-256-GCM key derivation
      // works regardless of input length.
      process.env.TOKEN_ENCRYPTION_KEY = 'tiny';
      const plaintext = 'short-secret-key works';
      const ciphertext = encrypt(plaintext);
      expect(decrypt(ciphertext)).toBe(plaintext);
    });
  });

  describe('integrity (auth tag)', () => {
    it('throws when ciphertext is tampered with (auth tag mismatch)', () => {
      const ciphertext = encrypt('integrity test');
      // Flip a bit in the encrypted payload region (after iv+tag)
      const buf = Buffer.from(ciphertext, 'base64');
      const last = buf[buf.length - 1] ?? 0;
      buf[buf.length - 1] = last ^ 0x01;
      const tampered = buf.toString('base64');
      expect(() => decrypt(tampered)).toThrow();
    });

    it('throws when auth tag is corrupted', () => {
      const ciphertext = encrypt('tag test');
      const buf = Buffer.from(ciphertext, 'base64');
      // Auth tag is bytes 16..32 (IV=16 bytes, then 16-byte tag)
      buf[20] = (buf[20] ?? 0) ^ 0xff;
      const corrupted = buf.toString('base64');
      expect(() => decrypt(corrupted)).toThrow();
    });

    it('throws on truncated input', () => {
      const ciphertext = encrypt('truncate test');
      // Too short to contain IV + tag + payload
      const truncated = ciphertext.slice(0, 10);
      expect(() => decrypt(truncated)).toThrow();
    });
  });
});
