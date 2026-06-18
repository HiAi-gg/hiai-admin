/**
 * Anti-SSRF resolution for the plugin proxy (`/api/[plugin]/[...path]`).
 *
 * A plugin's `proxy.target` is an operator-configured base URL (and, with Site
 * adapters, may come from the database). The catch-all `[...path]` is fully
 * attacker-controlled. Without validation, a crafted path could redirect the
 * request to an arbitrary host (`http://169.254.169.254/...`, `//evil.com`, …)
 * or traverse outside the intended backend.
 *
 * `resolveTarget` constrains the resolved URL to the SAME origin as `base` and
 * to http(s) only, rejecting path traversal and absolute/protocol-relative
 * paths. Returns `null` for anything it cannot prove safe.
 */
const ALLOWED_PROTOCOLS = new Set(['http:', 'https:']);

export function resolveTarget(base: string, path: string): URL | null {
  // Reject path traversal and absolute / protocol-relative / scheme-bearing paths
  // (decode first so percent-encoded `..` / `/` cannot smuggle past the check).
  let decoded: string;
  try {
    decoded = decodeURIComponent(path);
  } catch {
    return null;
  }
  for (const candidate of [path, decoded]) {
    if (
      candidate.includes('..') ||
      candidate.startsWith('/') ||
      candidate.startsWith('\\') ||
      candidate.includes('://')
    ) {
      return null;
    }
  }

  let baseUrl: URL;
  try {
    baseUrl = new URL(base);
  } catch {
    return null;
  }

  let url: URL;
  try {
    url = new URL(path, base.endsWith('/') ? base : `${base}/`);
  } catch {
    return null;
  }

  // The resolved target must stay within the configured backend's origin and
  // speak http(s). Anything that escaped the origin is an SSRF attempt.
  if (url.origin !== baseUrl.origin) return null;
  if (!ALLOWED_PROTOCOLS.has(url.protocol)) return null;
  return url;
}
