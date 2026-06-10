import { Elysia } from 'elysia';
import { env } from '../../lib/config.js';

/**
 * Content-Security-Policy middleware (report-only mode by default).
 *
 * Admin panel CSP — restricts resource loading to same-origin + known CDNs.
 * Switch from Report-Only to enforce by setting CSP_ENFORCE=true in env.
 */
export const cspMiddleware = new Elysia({ name: 'csp' }).onAfterHandle(({ set }) => {
  const isProduction = env.NODE_ENV === 'production';
  const enforce = process.env.CSP_ENFORCE === 'true';

  // Admin panel CSP directives
  const directives = [
    "default-src 'self'",
    // Allow inline scripts for SvelteKit hydration; nonce-based CSP is the next step
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    // Allow inline styles (Tailwind/shadcn inject inline styles)
    "style-src 'self' 'unsafe-inline'",
    // Images: same-origin + data URIs + HTTPS (for avatars, Stripe assets)
    "img-src 'self' data: https:",
    // API connections: same-origin + Stripe + configured backend URLs
    "connect-src 'self' https://api.stripe.com https://maps.stripe.com",
    // Fonts: same-origin only
    "font-src 'self'",
    // No iframes by default (Stripe checkout may need frame-src)
    "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
    // No object/embed
    "object-src 'none'",
    // No base tag hijacking
    "base-uri 'self'",
    // Form submissions only to self
    "form-action 'self'",
    // Prevent clickjacking
    "frame-ancestors 'none'",
    // Upgrade HTTP to HTTPS in production
    ...(isProduction ? ['upgrade-insecure-requests'] : []),
  ];

  const headerName = enforce ? 'Content-Security-Policy' : 'Content-Security-Policy-Report-Only';

  // Assign each header individually to preserve `set-cookie` (which can be
  // `string | string[]` in Elysia's HTTPHeaders type) and avoid widening the
  // whole-object assignment to `Record<string, string | number>`.
  set.headers[headerName] = directives.join('; ');
  set.headers['X-Content-Type-Options'] = 'nosniff';
  set.headers['X-Frame-Options'] = 'DENY';
  set.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin';
  set.headers['Permissions-Policy'] = 'camera=(), microphone=(), geolocation=()';
  if (isProduction) {
    set.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains';
  }
});
