# Security Audit Report — Wave 3 (hiai-admin)
> **Date:** 2026-06-10
> **Scope:** Backend API security hardening — input validation, auth guards, Stripe webhooks, dependency audit, CSP headers
> **Auditor:** Quality Guardian

---

## 1. Input Validation Audit

### Existing Zod Schemas (✅ Present)
| Schema File | Schemas |
|---|---|
| `tenant.schema.ts` | `createTenantSchema`, `updateTenantSchema`, `changePlanSchema` |
| `user.schema.ts` | `createUserSchema`, `updateUserSchema`, `assignRoleSchema`, `revokeRoleSchema` |
| `billing.schema.ts` | `subscribeSchema`, `upgradeSchema`, `downgradeSchema`, `cancelSchema`, `portalSchema` |
| `audit.schema.ts` | `auditListSchema` |
| `schemas.ts` | `paginationSchema`, `idParamSchema`, `textIdParamSchema`, `searchSchema` |

### Missing Validation Schemas (🔴 Created)
| Schema File | Schemas | Status |
|---|---|---|
| `settings.schema.ts` | `updateSettingSchema` | ✅ **CREATED** |
| `integration.schema.ts` | `updateIntegrationSchema`, `kofiConfigSchema`, `webhookPortalSchema` | ✅ **CREATED** |

### Endpoints Missing Zod Validation (body passed as `any`)

**🔴 CRITICAL — All use `body as any` with NO schema validation:**

| Route | File | Endpoint | Missing Schema |
|---|---|---|---|
| `tenants.ts` | POST `/` | Create tenant | `createTenantSchema` exists but NOT used |
| `tenants.ts` | PUT `/:id` | Update tenant | `updateTenantSchema` exists but NOT used |
| `tenants.ts` | POST `/:id/suspend` | Suspend tenant | No schema |
| `tenants.ts` | POST `/:id/change-plan` | Change plan | `changePlanSchema` exists but NOT used |
| `users.ts` | POST `/` | Create user | `createUserSchema` exists but NOT used |
| `users.ts` | PUT `/:id` | Update user | `updateUserSchema` exists but NOT used |
| `users.ts` | POST `/:id/assign-role` | Assign role | `assignRoleSchema` exists but NOT used |
| `users.ts` | POST `/:id/revoke-role` | Revoke role | `revokeRoleSchema` exists but NOT used |
| `settings.ts` | PUT `/:key` | Update setting | `updateSettingSchema` now exists (was missing) |
| `integrations.ts` | PUT `/:id` | Update integration | `updateIntegrationSchema` now exists (was missing) |
| `integrations.ts` | PUT `/kofi/config` | Ko-fi config | `kofiConfigSchema` now exists (was missing) |
| `billing.ts` | POST `/portal` | Stripe portal | `webhookPortalSchema` now exists (was missing) |

**🟡 MODERATE — Routes using Elysia `t` (TypeBox) for validation (acceptable):**
- `rbac.ts` — All endpoints use `t.Object()` for body/params validation ✅
- `billing-invoices.ts` — Uses `t.Object()` for params ✅

**Summary:** 12 endpoints have Zod schemas defined in `validation/` files but the schemas are NOT imported or used in the route handlers. The schemas were created as dead code. All POST/PUT endpoints cast `body as any` and pass it directly to services.

**FIX NEEDED:** Import and use `.safeParse()` on all POST/PUT handlers in:
- `tenants.ts` — 4 endpoints
- `users.ts` — 4 endpoints
- `settings.ts` — 1 endpoint
- `integrations.ts` — 2 endpoints
- `billing.ts` — 1 endpoint

---

## 2. Auth Guards Audit

### Route-by-Route Auth Status

| Route File | Endpoint | Auth | RBAC | Status |
|---|---|---|---|---|
| `health.ts` | `GET /api/health` | ❌ None | ❌ None | ✅ **CORRECT** (public) |
| `webhooks-stripe.ts` | `POST /api/webhooks/stripe` | ❌ None | ❌ None | ✅ **CORRECT** (Stripe signature) |
| `tenants.ts` | All endpoints | ✅ `authMiddleware` | ✅ `requirePermission` | ✅ OK |
| `users.ts` | All endpoints | ✅ `authMiddleware` | ✅ `requirePermission` | ✅ OK |
| `billing.ts` | `GET /api/billing/plans` | ✅ `authMiddleware` | ❌ None | 🟡 Auth-only (public plans list) |
| `billing.ts` | `POST /api/billing/portal` | ✅ `authMiddleware` | ✅ `requireSuperAdmin` | ✅ OK |
| `billing-invoices.ts` | All endpoints | ❌ **MISSING** | ✅ `requirePermission` | 🟡 Uses rbac but no auth |
| `analytics.ts` | All endpoints | ✅ `authMiddleware` | ✅ `requireSuperAdmin` | ✅ OK |
| `settings.ts` | All endpoints | ✅ `authMiddleware` | ✅ `requireSuperAdmin` | ✅ OK |
| `audit.ts` | `GET /api/audit` | ✅ `authMiddleware` | ✅ `requireSuperAdmin` | ✅ OK |
| `integrations.ts` | All endpoints | ✅ `authMiddleware` | ✅ `requireSuperAdmin` | ✅ OK |
| `rbac.ts` | All endpoints | ❌ **MISSING** | ✅ `requirePermission` | 🟡 Uses rbac but no auth |
| `proxy-post.ts` | `ALL /api/social/*` | ❌ **MISSING** | ❌ **MISSING** | 🔴 **CRITICAL** |
| `proxy-store.ts` | `ALL /api/shop/*` | ❌ **MISSING** | ❌ **MISSING** | 🔴 **CRITICAL** |
| `events.ts` | `GET /api/events` | ❌ **MISSING** | ❌ **MISSING** | 🔴 **Not mounted** (dead code) |

### 🔴 CRITICAL Findings

1. **`proxy-post.ts`** — `ALL /api/social/*` has **NO auth middleware**. Any unauthenticated user can proxy arbitrary requests to `hiai-post` backend (port 50300). This is a **server-side request forgery (SSRF) vector**.

2. **`proxy-store.ts`** — `ALL /api/shop/*` has **NO auth middleware**. Same issue — unauthenticated proxy to `hiai-store` backend (port 50400).

3. **`events.ts`** — SSE endpoint has no auth. While not currently mounted in `index.ts`, if mounted, it would expose real-time events to unauthenticated users.

### 🟡 MODERATE Findings

4. **`billing-invoices.ts`** — Uses `rbacMiddleware` (which checks `user` from context) but does NOT use `authMiddleware`. The rbac middleware will fail with 401 if `user` is null, providing implicit auth protection, but this is fragile.

5. **`rbac.ts`** — Same pattern as billing-invoices — relies on rbac middleware for implicit auth.

### Public Endpoints (Expected)
- `GET /api/health` — ✅ Correct (no sensitive data)
- `POST /api/webhooks/stripe` — ✅ Correct (verified by Stripe signature)
- Better Auth routes (mounted via `auth.handler`) — ✅ Correct

---

## 3. Stripe Webhook Signature Verification

### Status: ✅ PROPERLY IMPLEMENTED

**Evidence from `webhooks-stripe.ts`:**
```typescript
const signature = request.headers.get('stripe-signature');
if (!signature) {
  set.status = 400;
  return { error: 'Missing stripe-signature header' };
}
const body = await request.text();
const event = await stripeService.constructWebhookEvent(body, signature);
```

**Evidence from `stripe.service.ts`:**
```typescript
async constructWebhookEvent(body: string | Buffer, signature: string) {
  const secret = env.STRIPE_WEBHOOK_SECRET || '';
  return stripe.webhooks.constructEvent(body, signature, secret);
}
```

**Verification:**
- ✅ `stripe-signature` header is checked
- ✅ `request.text()` preserves raw body (not parsed JSON)
- ✅ `stripe.webhooks.constructEvent()` is called with raw body + signature + secret
- ✅ Error handling catches verification failures (returns 400)
- ✅ No `authMiddleware` on webhook route (correct — Stripe authenticates via signature)

**One concern:** `env.STRIPE_WEBHOOK_SECRET || ''` — if `STRIPE_WEBHOOK_SECRET` is not set, `constructEvent()` will be called with an empty string, which will always fail. This is safe (fail-closed) but should be validated at startup.

---

## 4. Dependency Security Audit

### Backend (`backend/`)

| Severity | Package | Vulnerability | Fix |
|---|---|---|---|
| 🔴 **CRITICAL** | `vitest <3.2.6` | Arbitrary file read/execute via Vitest UI server (GHSA-5xrq-8626-4rwp) | `bun update vitest` |
| 🟡 Moderate | `vite <=6.4.1` | Path traversal in optimized deps `.map` handling (GHSA-4w7w-66w2-5vf9) | `bun update vite` |
| 🟡 Moderate | `esbuild <=0.24.2` | Dev server request forgery (GHSA-67mh-4wv8-2f99) | `bun update esbuild` |

**Risk Assessment:**
- `vitest` critical: Only exploitable when Vitest UI server is listening. **Not exploitable in production** (dev-only dependency). Fix anyway.
- `vite`/`esbuild`: Dev-only dependencies. **Not exploitable in production.** Fix during next update cycle.

### Frontend (`app/`)

| Severity | Package | Vulnerability | Fix |
|---|---|---|---|
| 🟡 Moderate | `esbuild <=0.24.2` | Dev server request forgery | `bun update esbuild` |
| 🟡 Moderate | `jsondiffpatch <0.7.2` | XSS via HtmlFormatter (GHSA-33vc-wfww-vjfv) | `bun update jsondiffpatch` |
| 🟢 Low | `ai <5.0.52` | Filetype whitelist bypass | `bun update ai` |
| 🟢 Low | `@ai-sdk/provider-utils` | Uncontrolled resource consumption | `bun update @ai-sdk/provider-utils` |
| 🟢 Low | `cookie <0.7.0` | Out-of-bounds characters accepted | `bun update cookie` |

**Risk Assessment:** All vulnerabilities are dev-only or low-severity. None are exploitable in the admin panel's production runtime.

### Recommendation
```bash
cd backend && bun update  # Fix critical vitest + moderate vite/esbuild
cd app && bun update       # Fix moderate jsondiffpatch + low deps
```

---

## 5. CSP Headers

### Status: ✅ IMPLEMENTED (Report-Only Mode)

**Created:** `backend/src/api/middleware/csp.ts`

**Directives:**
```
default-src 'self'
script-src 'self' 'unsafe-inline' 'unsafe-eval'
style-src 'self' 'unsafe-inline'
img-src 'self' data: https:
connect-src 'self' https://api.stripe.com https://maps.stripe.com
font-src 'self'
frame-src 'self' https://js.stripe.com https://hooks.stripe.com
object-src 'none'
base-uri 'self'
form-action 'self'
frame-ancestors 'none'
upgrade-insecure-requests (production only)
```

**Additional Security Headers:**
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains` (production only)

**Mode:** `Content-Security-Policy-Report-Only` by default. Set `CSP_ENFORCE=true` to switch to enforcement.

**Integration:** Added to `backend/src/api/index.ts` — applied globally before route handlers.

---

## Summary of Changes Applied

| # | File | Change | Status |
|---|---|---|---|
| 1 | `backend/src/api/middleware/csp.ts` | **NEW** — CSP + security headers middleware | ✅ Created |
| 2 | `backend/src/api/index.ts` | Added `cspMiddleware` import and `.use(cspMiddleware)` | ✅ Modified |
| 3 | `backend/src/api/validation/settings.schema.ts` | **NEW** — `updateSettingSchema` | ✅ Created |
| 4 | `backend/src/api/validation/integration.schema.ts` | **NEW** — `updateIntegrationSchema`, `kofiConfigSchema`, `webhookPortalSchema` | ✅ Created |
| 5 | `SECURITY-AUDIT-WAVE3.md` | **NEW** — This report | ✅ Created |

---

## Remaining Work (Requires Coder Agent)

### 🔴 HIGH Priority — Must Fix Before Production

1. **Add Zod validation to all POST/PUT route handlers** — 12 endpoints need `.safeParse()` calls:
   - `tenants.ts` (4 endpoints)
   - `users.ts` (4 endpoints)
   - `settings.ts` (1 endpoint)
   - `integrations.ts` (2 endpoints)
   - `billing.ts` (1 endpoint)

2. **Add `authMiddleware` to proxy routes:**
   - `proxy-post.ts` — Add `.use(authMiddleware)` + `requireSuperAdmin`
   - `proxy-store.ts` — Add `.use(authMiddleware)` + `requireSuperAdmin`

3. **Add `authMiddleware` to `billing-invoices.ts` and `rbac.ts`** — Belt-and-suspenders auth.

4. **Run dependency updates:**
   ```bash
   cd backend && bun update
   cd app && bun update
   ```

### 🟡 MEDIUM Priority — Hardening

5. **Stripe webhook startup validation** — Fail if `STRIPE_WEBHOOK_SECRET` is not set:
   ```typescript
   if (!env.STRIPE_WEBHOOK_SECRET) throw new Error('STRIPE_WEBHOOK_SECRET is required');
   ```

6. **Rate limiting on Stripe webhook endpoint** — Add `createRateLimiter('billing')` to prevent webhook flooding.

7. **Proxy route allowlisting** — Restrict proxy targets to known paths only (prevent arbitrary path traversal).

8. **`events.ts`** — Either add auth or delete the dead SSE endpoint.

### 🟢 LOW Priority — Future

9. **Nonce-based CSP** — Replace `'unsafe-inline'` with nonces for script/style tags (requires SvelteKit integration).
10. **CORS tightening** — In production, restrict to exact admin domain rather than `BETTER_AUTH_URL`.

---

## Overall Security Score: 7/10

| Category | Score | Notes |
|---|---|---|
| Input Validation | 5/10 | Schemas exist but not used in handlers |
| Auth Guards | 7/10 | Most routes protected; proxy routes exposed |
| Stripe Webhooks | 9/10 | Properly implemented; minor startup validation gap |
| Dependencies | 7/10 | Critical vitest (dev-only); all prod deps clean |
| CSP Headers | 8/10 | Implemented in report-mode; needs nonce evolution |
| **Overall** | **7/10** | Solid foundation; needs validation wiring + proxy auth |
