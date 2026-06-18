import { describe, it, expect } from 'vitest';
import { resolveTarget } from '../../src/lib/server/proxy-target.js';

const BASE = 'http://hiai-post:50300';

describe('resolveTarget (proxy anti-SSRF)', () => {
  describe('legitimate paths within the configured origin', () => {
    it('resolves a simple path', () => {
      const url = resolveTarget(BASE, 'articles');
      expect(url?.toString()).toBe('http://hiai-post:50300/articles');
    });

    it('preserves the query string', () => {
      const url = resolveTarget(BASE, 'articles?drafts=1&lang=en');
      expect(url?.origin).toBe('http://hiai-post:50300');
      expect(url?.pathname).toBe('/articles');
      expect(url?.search).toBe('?drafts=1&lang=en');
    });

    it('resolves nested paths', () => {
      const url = resolveTarget(BASE, 'homepage-blocks/admin/site/abc');
      expect(url?.pathname).toBe('/homepage-blocks/admin/site/abc');
    });

    it('works when the base already has a trailing slash', () => {
      const url = resolveTarget('https://api.example.com/', 'v1/sites');
      expect(url?.toString()).toBe('https://api.example.com/v1/sites');
    });
  });

  describe('SSRF / traversal attempts are rejected', () => {
    it('rejects path traversal with ..', () => {
      expect(resolveTarget(BASE, '../secret')).toBeNull();
      expect(resolveTarget(BASE, 'a/../../b')).toBeNull();
    });

    it('rejects percent-encoded traversal', () => {
      expect(resolveTarget(BASE, '%2e%2e/secret')).toBeNull();
    });

    it('rejects absolute paths (leading slash)', () => {
      expect(resolveTarget(BASE, '/admin')).toBeNull();
    });

    it('rejects protocol-relative paths pointing elsewhere', () => {
      expect(resolveTarget(BASE, '//evil.com/x')).toBeNull();
    });

    it('rejects absolute URLs to another origin', () => {
      expect(resolveTarget(BASE, 'http://evil.com/x')).toBeNull();
      expect(resolveTarget(BASE, 'https://169.254.169.254/latest/meta-data')).toBeNull();
    });

    it('rejects backslash-prefixed paths', () => {
      expect(resolveTarget(BASE, '\\evil')).toBeNull();
    });

    it('rejects scheme-confusion paths that escape the base origin', () => {
      // "evil.com:1234/x" parses with `evil.com:` as a scheme → origin escapes base
      expect(resolveTarget(BASE, 'evil.com:1234/x')).toBeNull();
    });
  });

  describe('invalid base', () => {
    it('returns null for an unparseable base', () => {
      expect(resolveTarget('not a url', 'articles')).toBeNull();
    });

    it('rejects a non-http(s) base origin', () => {
      expect(resolveTarget('ftp://files.example.com', 'x')).toBeNull();
    });
  });
});
