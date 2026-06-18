import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Proxy header whitelist regression test (static analysis).
 * Verifies that the proxy endpoint only forwards whitelisted headers to the upstream,
 * preventing leakage of sensitive headers like x-secret, host, etc.
 *
 * Whitelisted headers:
 * - content-type (from inbound request)
 * - authorization (either minted JWT for jwt auth, or forwarded from caller for api-key)
 * - cookie (for api-key adapters without user)
 *
 * Blocked headers (never forwarded):
 * - host, user-agent, referer, x-*, x-forwarded-*, etc.
 */

describe('proxy headers (whitelist regression)', () => {
  it('only sets whitelisted headers in the outbound request', () => {
    // Read the proxy handler source code
    const proxyPath = path.join(__dirname, '../../src/routes/api/[plugin]/[...path]/+server.ts');
    const source = fs.readFileSync(proxyPath, 'utf-8');

    // The proxy must only use headers.set() for whitelisted headers.
    // Valid calls are:
    // - headers.set('content-type', ...)
    // - headers.set('authorization', ...)
    // - headers.set('cookie', ...)
    // Any other headers.set() call would be a violation.

    // Extract all headers.set() calls
    const headerSetPattern = /headers\.set\('([^']+)'/g;
    const matches = [...source.matchAll(headerSetPattern)];
    const headerNames = matches.map((m) => m[1].toLowerCase());

    const whitelisted = ['content-type', 'authorization', 'cookie', 'x-tenant-id'];
    for (const header of headerNames) {
      expect(whitelisted).toContain(header);
      if (!whitelisted.includes(header)) {
        throw new Error(
          `Header '${header}' is not in the whitelist. Only whitelisted headers should be forwarded.`,
        );
      }
    }

    // Verify that the proxy creates headers with new Headers()
    expect(source).toContain('new Headers()');

    // Verify no direct request.headers forwarding (which would leak all headers)
    expect(source).not.toMatch(/headers\s*=\s*request\.headers/);
  });

  it('does not directly copy request.headers (which would leak all headers)', () => {
    const proxyPath = path.join(__dirname, '../../src/routes/api/[plugin]/[...path]/+server.ts');
    const source = fs.readFileSync(proxyPath, 'utf-8');

    // The proxy must NOT do something like:
    // headers = new Headers(request.headers) or
    // for (const [k, v] of request.headers) headers.set(k, v)
    // This would leak all inbound headers to the upstream.

    expect(source).not.toMatch(/headers\s*=\s*new\s+Headers\s*\(\s*request\.headers\s*\)/);
  });

  it('only forwards content-type from inbound request', () => {
    const proxyPath = path.join(__dirname, '../../src/routes/api/[plugin]/[...path]/+server.ts');
    const source = fs.readFileSync(proxyPath, 'utf-8');

    // Verify that content-type is extracted conditionally
    expect(source).toContain("request.headers.get('content-type')");
    expect(source).toContain("headers.set('content-type'");
  });

  it('only forwards authorization or cookie in fallback mode', () => {
    const proxyPath = path.join(__dirname, '../../src/routes/api/[plugin]/[...path]/+server.ts');
    const source = fs.readFileSync(proxyPath, 'utf-8');

    // Verify authorization is forwarded conditionally
    expect(source).toContain("request.headers.get('authorization')");
    expect(source).toContain("headers.set('authorization'");

    // Verify cookie is forwarded conditionally
    expect(source).toContain("request.headers.get('cookie')");
    expect(source).toContain("headers.set('cookie'");
  });

  it('does not forward x-forwarded-* or other proxy headers', () => {
    const proxyPath = path.join(__dirname, '../../src/routes/api/[plugin]/[...path]/+server.ts');
    const source = fs.readFileSync(proxyPath, 'utf-8');

    // These dangerous headers should never be forwarded
    const dangerousHeaders = [
      'x-forwarded-for',
      'x-forwarded-host',
      'x-forwarded-proto',
      'x-original-url',
      'host',
      'user-agent',
      'referer',
    ];

    for (const header of dangerousHeaders) {
      // Check that the header is not being set on the outbound headers
      expect(source).not.toContain(`headers.set('${header}'`);
      expect(source).not.toContain(`headers.set("${header}"`);
    }
  });

  it('creates a fresh Headers object for the outbound request', () => {
    const proxyPath = path.join(__dirname, '../../src/routes/api/[plugin]/[...path]/+server.ts');
    const source = fs.readFileSync(proxyPath, 'utf-8');

    // The proxy must create a new Headers object to avoid leaking inbound headers
    expect(source).toContain('new Headers()');

    // And it must use the fresh headers object for the fetch call
    expect(source).toContain('const init: RequestInit = { method: request.method, headers }');
  });

  it('verifies the whitelist only contains allowed headers', () => {
    const proxyPath = path.join(__dirname, '../../src/routes/api/[plugin]/[...path]/+server.ts');
    const source = fs.readFileSync(proxyPath, 'utf-8');

    // Count the number of headers.set() calls
    const headerSetPattern = /headers\.set\('([^']+)'/g;
    const matches = [...source.matchAll(headerSetPattern)];
    const uniqueHeaders = new Set(matches.map((m) => m[1].toLowerCase()));

    // Should have exactly 4 whitelisted headers (content-type, authorization,
    // cookie, x-tenant-id).
    expect(uniqueHeaders.size).toBe(4);
    expect(uniqueHeaders).toEqual(
      new Set(['content-type', 'authorization', 'cookie', 'x-tenant-id']),
    );
  });
});
