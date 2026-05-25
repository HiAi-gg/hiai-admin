# TODO — hiai-admin

> **Generated:** 2026-05-23
> **Goal:** Build central admin panel for the HiAi SaaS platform
> **Stack:** Bun 1.3.14+, Elysia 1.4.28+, Drizzle ORM 0.45.2+, PostgreSQL 18.4 + pgvector, Redis 8.6+, Svelte 5 + SvelteKit 2.60+, shadcn-svelte, TanStack Query + Table, Better Auth, Stripe

---

## Phase 0 — Foundation

**Goal:** Scaffold project, install deps, configure DB/Redis, set up auth and middleware.

- [ ] 0.1 Create `package.json` with all dependencies (bun, elysia, drizzle-orm, zod, stripe, better-auth, ioredis, @tanstack/svelte-query, @tanstack/svelte-table)
- [ ] 0.2 Create `tsconfig.json` (ESNext module, bundler resolution, strict)
- [ ] 0.3 Create `drizzle.config.ts` pointing to `hiai_admin` database
- [ ] 0.4 Create `.env.example` with all required env vars (see README.md)
- [ ] 0.5 Create `.gitignore` (node_modules, .env, dist, .svelte-kit)
- [ ] 0.6 Set up `src/lib/config.ts` — env-driven configuration with Zod validation
- [ ] 0.7 Set up `src/lib/logger.ts` — pino structured logging
- [ ] 0.8 Set up `src/lib/redis.ts` — ioredis client with retry, key prefix `hiadmin:`
- [ ] 0.9 Set up `src/lib/db.ts` — Drizzle PostgreSQL client with connection pooling
- [ ] 0.10 Set up `src/lib/encryption.ts` — AES-256-GCM for credential storage
- [ ] 0.11 Set up Better Auth config (`src/auth/`) with Drizzle adapter + TOTP 2FA plugin
- [ ] 0.12 Create `src/api/index.ts` — Elysia entry point with CORS, error handler, route mounting
- [ ] 0.13 Create `src/api/middleware/auth.ts` — JWT verification + super_admin role check
- [ ] 0.14 Create `src/api/middleware/rbac.ts` — permission-based access control middleware
- [ ] 0.15 Create `src/api/middleware/audit.ts` — automatic audit logging for CUD operations
- [ ] 0.16 Create `src/api/middleware/rateLimiter.ts` — Redis-backed sliding window
- [ ] 0.17 Create `src/api/middleware/apiLogger.ts` — request/response logging
- [ ] 0.18 Create health check route: `GET /api/health` (DB + Redis connectivity)
- [ ] 0.19 Scaffold SvelteKit frontend (`app/`) with Svelte 5, Tailwind v4, shadcn-svelte
- [ ] 0.20 Create `app/src/lib/api.ts` — typed fetch wrapper for backend API
- [ ] 0.21 Create `app/src/lib/stores/auth.svelte.ts` — auth state management
- [ ] 0.22 Create `docker-compose.yml` for hiai-admin-api + hiai-admin-frontend
- [ ] 0.23 Create Dockerfiles for both API and frontend

**Effort:** ~8h

---

## Phase 1 — Core Database Schemas

**Goal:** Define all Drizzle ORM tables and generate initial migration.

- [ ] 1.1 `src/db/schema/tenant.ts` — `tenants` table (id, slug, name, email, stripe_customer_id, stripe_account_id, status, plan, settings JSONB, created_at, updated_at)
- [ ] 1.2 `src/db/schema/user.ts` — `users` table (id, email, name, avatar_url, role, two_factor_enabled, last_login_at, created_at)
- [ ] 1.3 `src/db/schema/user-tenant-access.ts` — `user_tenant_access` table (id, user_id, tenant_id, role, permissions JSONB, created_at)
- [ ] 1.4 `src/db/schema/role.ts` — `roles` table (id, name, description, is_system, created_at)
- [ ] 1.5 `src/db/schema/permission.ts` — `permissions` table (id, resource, action, description)
- [ ] 1.6 `src/db/schema/role-permission.ts` — `role_permissions` table (id, role_id, permission_id)
- [ ] 1.7 `src/db/schema/subscription.ts` — `subscriptions` table (id, tenant_id, stripe_subscription_id, plan, status, current_period_start, current_period_end, cancel_at_period_end)
- [ ] 1.8 `src/db/schema/invoice.ts` — `invoices` table (id, tenant_id, stripe_invoice_id, amount, currency, status, pdf_url, created_at)
- [ ] 1.9 `src/db/schema/setting.ts` — `settings` table (id, key, value, description, updated_at) — global platform config
- [ ] 1.10 `src/db/schema/audit-log.ts` — `audit_logs` table (id, actor_id, action, resource, resource_id, metadata JSONB, ip_address, created_at)
- [ ] 1.11 `src/db/schema/integration.ts` — `integrations` table (id, name, type, credentials_encrypted, config JSONB, status, created_at)
- [ ] 1.12 `src/db/schema/webhook.ts` — `webhooks` table (id, tenant_id, url, events, secret, status, created_at)
- [ ] 1.13 Create Drizzle relations for all schemas
- [ ] 1.14 Generate and run initial migration (`bun run db:generate`)
- [ ] 1.15 Create seed script with default roles, permissions, and super admin user
- [ ] 1.16 Seed default permissions matrix (all resource:action combinations)

**Effort:** ~6h

---

## Phase 2 — API Layer

**Goal:** CRUD routes for all entities with RBAC, audit logging, and validation.

### 2.1 Tenant Module
- [ ] 2.1.1 `src/modules/tenant/tenant.service.ts` — CRUD, provisioning, suspension, deletion
- [ ] 2.1.2 `src/modules/tenant/provisioning.ts` — create tenant + Stripe customer + welcome email
- [ ] 2.1.3 `src/api/routes/tenants.ts` — GET (list, detail), POST (create), PUT (update), DELETE (soft-delete)
- [ ] 2.1.4 `src/api/routes/tenants-actions.ts` — POST suspend, POST reactivate, POST change-plan
- [ ] 2.1.5 `src/api/validation/tenant.schema.ts` — Zod schemas

### 2.2 User Module
- [ ] 2.2.1 `src/modules/user/user.service.ts` — CRUD, role assignment, 2FA management
- [ ] 2.2.2 `src/api/routes/users.ts` — GET (list, detail), POST (create), PUT (update), DELETE
- [ ] 2.2.3 `src/api/routes/users-roles.ts` — POST assign-role, POST revoke-role
- [ ] 2.2.4 `src/api/validation/user.schema.ts` — Zod schemas

### 2.3 RBAC Module
- [ ] 2.3.1 `src/modules/rbac/rbac.service.ts` — role CRUD, permission CRUD, role-permission mapping
- [ ] 2.3.2 `src/api/routes/roles.ts` — GET (list), POST (create), PUT (update), DELETE
- [ ] 2.3.3 `src/api/routes/permissions.ts` — GET (list), POST assign-to-role, DELETE revoke-from-role

### 2.4 Audit Module
- [ ] 2.4.1 `src/modules/audit/audit.service.ts` — record, query (filters: actor, action, resource, date range), export
- [ ] 2.4.2 `src/api/routes/audit.ts` — GET (list with filters), GET export (CSV)

### 2.5 Settings Module
- [ ] 2.5.1 `src/modules/settings/settings.service.ts` — get/set/list global settings
- [ ] 2.5.2 `src/api/routes/settings.ts` — GET (list, single), PUT (update)

### 2.6 Integration Module
- [ ] 2.6.1 `src/modules/integration/integration.service.ts` — CRUD, credential encryption, status check
- [ ] 2.6.2 `src/api/routes/integrations.ts` — GET (list), POST (create), PUT (update), DELETE, POST test-connection

**Effort:** ~14h

---

## Phase 3 — Billing & Subscriptions

**Goal:** Stripe Billing integration for platform subscriptions and tenant billing.

- [ ] 3.1 `src/modules/billing/stripe.service.ts` — Stripe SDK wrapper (create customer, create subscription, manage plans)
- [ ] 3.2 `src/modules/billing/subscription.service.ts` — subscription lifecycle (create, upgrade, downgrade, cancel, reactivate)
- [ ] 3.3 `src/modules/billing/invoice.service.ts` — invoice listing, PDF download, payment tracking
- [ ] 3.4 `src/modules/billing/plan.service.ts` — plan definitions (Free, Pro, Enterprise) with feature matrix
- [ ] 3.5 `src/api/routes/billing.ts` — GET plans, GET current subscription, POST subscribe, POST upgrade, POST cancel
- [ ] 3.6 `src/api/routes/billing-invoices.ts` — GET invoices, GET invoice/:id/pdf
- [ ] 3.7 `src/api/routes/billing-portal.ts` — POST create-portal-session (Stripe Customer Portal redirect)
- [ ] 3.8 `src/api/routes/webhooks-stripe.ts` — webhook handler (invoice.paid, invoice.payment_failed, customer.subscription.updated, customer.subscription.deleted)
- [ ] 3.9 Trial management (14-day trial, auto-convert to paid)
- [ ] 3.10 Grace period handling (7 days after payment failure before suspension)
- [ ] 3.11 Platform fee tracking (commission from tenant transactions via Connect)

**Effort:** ~12h

---

## Phase 4 — Dashboard

**Goal:** Platform overview with key SaaS metrics and real-time data.

- [ ] 4.1 `src/modules/analytics/metrics.service.ts` — MRR/ARR calculation, churn rate, LTV, CAC
- [ ] 4.2 `src/modules/analytics/tenant-metrics.ts` — active tenants, new tenants, growth rate, tenant distribution by plan
- [ ] 4.3 `src/api/routes/analytics.ts` — GET /api/analytics/overview, /api/analytics/mrr, /api/analytics/churn, /api/analytics/tenants
- [ ] 4.4 `app/src/routes/dashboard/+page.svelte` — overview page with key metric cards
- [ ] 4.5 `app/src/routes/dashboard/+page.server.ts` — load all dashboard metrics
- [ ] 4.6 MRR trend chart (LayerChart — line chart, 12 months)
- [ ] 4.7 Tenant growth chart (bar chart, monthly new tenants)
- [ ] 4.8 Churn rate chart (line chart, monthly)
- [ ] 4.9 Revenue breakdown by plan (pie/donut chart)
- [ ] 4.10 Recent activity feed (latest audit log entries)
- [ ] 4.11 Real-time active tenants count (SSE endpoint)
- [ ] 4.12 Quick actions: create tenant, view alerts, manage billing

**Effort:** ~10h

---

## Phase 5 — Tenant Management UI

**Goal:** Full tenant lifecycle management from the admin panel.

- [ ] 5.1 `app/src/routes/tenants/+page.svelte` — tenant list with TanStack Table (sortable, filterable, paginated)
- [ ] 5.2 `app/src/routes/tenants/+page.server.ts` — load tenants with pagination params
- [ ] 5.3 `app/src/routes/tenants/[id]/+page.svelte` — tenant detail page (info, settings, billing, users)
- [ ] 5.4 `app/src/routes/tenants/[id]/+page.server.ts` — load tenant detail with related data
- [ ] 5.5 Create tenant modal/form (name, slug, plan, owner email)
- [ ] 5.6 Suspend tenant action (confirmation modal, reason input)
- [ ] 5.7 Reactivate tenant action
- [ ] 5.8 Change plan action (upgrade/downgrade with proration preview)
- [ ] 5.9 Tenant settings editor (feature flags, config overrides)
- [ ] 5.10 Tenant users list (who has access, their roles)
- [ ] 5.11 Tenant billing summary (current plan, next invoice, payment method)
- [ ] 5.12 Tenant health indicator (from HiAi Observe — uptime, error rate)

**Effort:** ~10h

---

## Phase 6 — User Management UI

**Goal:** User administration with role management and 2FA.

- [ ] 6.1 `app/src/routes/users/+page.svelte` — user list with TanStack Table
- [ ] 6.2 `app/src/routes/users/[id]/+page.svelte` — user detail (profile, roles, tenant access, activity)
- [ ] 6.3 Create user form (email, name, role, tenant assignment)
- [ ] 6.4 Edit user form (name, avatar, role changes)
- [ ] 6.5 Role assignment UI (checkbox matrix for permissions)
- [ ] 6.6 2FA management (enable/disable, view status, force reset)
- [ ] 6.7 Session management (list active sessions, force logout)
- [ ] 6.8 User activity log (last N actions from audit_logs)
- [ ] 6.9 Bulk actions (deactivate, change role)

**Effort:** ~8h

---

## Phase 7 — Billing UI

**Goal:** Billing dashboard with subscription management and invoice history.

- [ ] 7.1 `app/src/routes/billing/+page.svelte` — billing overview (current plan, usage, next invoice)
- [ ] 7.2 `app/src/routes/billing/+page.server.ts` — load billing data
- [ ] 7.3 Plan comparison table (Free vs Pro vs Enterprise features)
- [ ] 7.4 Subscription management (upgrade, downgrade, cancel with confirmation)
- [ ] 7.5 Invoice history table (TanStack Table with download links)
- [ ] 7.6 Stripe Customer Portal redirect button
- [ ] 7.7 Platform fee summary (total commission earned, per-tenant breakdown)
- [ ] 7.8 Revenue analytics (MRR trend, ARPU, plan distribution)

**Effort:** ~8h

---

## Phase 8 — Security & Audit UI

**Goal:** Audit log viewer, session management, and security settings.

- [ ] 8.1 `app/src/routes/security/+page.svelte` — security overview (2FA status, active sessions, recent alerts)
- [ ] 8.2 `app/src/routes/security/audit/+page.svelte` — audit log viewer (TanStack Table with filters)
- [ ] 8.3 Audit log filters (actor, action, resource, date range, IP address)
- [ ] 8.4 Audit log export (CSV download)
- [ ] 8.5 Session management (list all active sessions, force terminate)
- [ ] 8.6 Security settings (require 2FA for all admins, session timeout, IP allowlist)
- [ ] 8.7 Login history (successful/failed attempts)

**Effort:** ~6h

---

## Phase 9 — Settings & Integrations UI

**Goal:** Platform configuration and third-party service management.

- [ ] 9.1 `app/src/routes/settings/+page.svelte` — global settings editor (key-value with sections)
- [ ] 9.2 Settings sections: General (name, URL, timezone), Email (SMTP, templates), Features (flags), Limits (rate limits, quotas)
- [ ] 9.3 `app/src/routes/integrations/+page.svelte` — integration list with status indicators
- [ ] 9.4 Integration detail page (credentials, config, test connection, health)
- [ ] 9.5 Stripe integration setup (API key input, webhook secret, test mode toggle)
- [ ] 9.6 Shippo/Easyship integration setup
- [ ] 9.7 HiAi Observe integration setup (URL, DSN, status check)
- [ ] 9.8 Novu integration setup (API key, notification templates)
- [ ] 9.9 Webhook management (create, edit, delete, test fire)

**Effort:** ~8h

---

## Phase 10 — Polish & Production

**Goal:** Tests, documentation, Docker hardening, CI/CD.

### Testing
- [ ] 10.1 Unit tests for RBAC service (permission checks, role hierarchy)
- [ ] 10.2 Unit tests for audit service (recording, querying, export)
- [ ] 10.3 Unit tests for billing service (subscription lifecycle, invoice generation)
- [ ] 10.4 Unit tests for tenant provisioning (create + Stripe + email flow)
- [ ] 10.5 Integration tests for all CRUD routes (auth, RBAC, audit logging)
- [ ] 10.6 Integration tests for Stripe webhooks (mock events)
- [ ] 10.7 API route tests (auth, rate limiting, validation, error handling)

### Documentation
- [ ] 10.8 API documentation (endpoint reference, request/response examples)
- [ ] 10.9 Admin onboarding guide (first-time setup, creating super admin)
- [ ] 10.10 Developer setup guide

### Docker & Deployment
- [ ] 10.11 Multi-stage Dockerfiles (build → production image)
- [ ] 10.12 Docker health checks for all services
- [ ] 10.13 `.dockerignore` files
- [ ] 10.14 Caddy route configuration for admin domains

### Security
- [ ] 10.15 Input sanitization audit (Zod schemas on all endpoints)
- [ ] 10.16 CORS configuration (admin domain only)
- [ ] 10.17 Rate limit tuning per endpoint tier
- [ ] 10.18 Stripe webhook signature verification
- [ ] 10.19 SQL injection audit (all queries parameterized via Drizzle)
- [ ] 10.20 CSRF protection for state-changing operations
- [ ] 10.21 Content Security Policy headers

### Performance
- [ ] 10.22 Pagination for all list endpoints (cursor-based)
- [ ] 10.23 Redis caching for frequently accessed data (settings, permissions)
- [ ] 10.24 SSR performance audit (SvelteKit load functions)
- [ ] 10.25 TanStack Query cache invalidation strategy

**Effort:** ~16h

---

## Summary

| Phase | Description | Effort | Status |
|-------|-------------|--------|--------|
| 0 | Foundation | ~8h | Pending |
| 1 | Core Database Schemas | ~6h | Pending |
| 2 | API Layer | ~14h | Pending |
| 3 | Billing & Subscriptions | ~12h | Pending |
| 4 | Dashboard | ~10h | Pending |
| 5 | Tenant Management UI | ~10h | Pending |
| 6 | User Management UI | ~8h | Pending |
| 7 | Billing UI | ~8h | Pending |
| 8 | Security & Audit UI | ~6h | Pending |
| 9 | Settings & Integrations UI | ~8h | Pending |
| 10 | Polish & Production | ~16h | Pending |
| **Total** | | **~106h** | |

---

## Phase 11: Critic Audit Fixes (2026-05-25)

> **Source:** 8 parallel critics audited plugin system, @hiai/ui migration, and webs/admin feature migration.
> **Result:** 5 PASS, 5 WARNING, 1 FAIL (7/14 webs/admin features not migrated)

### 11.1 Plugin System — ✅ PASS (no action needed)
- [x] Plugin types (HiAiPlugin, NavGroup, NavItem, ProxyConfig) — correct
- [x] Plugin registry (registerPlugin, getNavGroups, findPage, getProxyConfig) — correct
- [x] 4 manifests (hiai-post, hiai-store, kofi, umami) — valid
- [x] Sidebar reads from plugin registry — dynamic nav works
- [x] API proxy catch-all — 5 HTTP methods, error handling
- [x] Backend proxy routes (post:50300, store:50400) — working

### 11.2 @hiai/ui Migration — ✅ PASS (no action needed)
- [x] api.ts → createApi from @hiai/ui
- [x] auth.svelte.ts → re-export from @hiai/ui
- [x] notifications.svelte.ts → re-export from @hiai/ui
- [x] sidebar.svelte.ts → re-export from @hiai/ui

### 11.3 WARNING: Dead local AdminSidebar.svelte
- [ ] **Delete** `app/src/lib/components/AdminSidebar.svelte` (54 lines) — layout uses @hiai/ui, this is dead code
- **File:** `app/src/lib/components/AdminSidebar.svelte`
- **Effort:** 5min

### 11.4 WARNING: Umami page missing server load
- [ ] **Create** `app/src/routes/(admin)/analytics/umami/+page.server.ts`
- Should load `UMAMI_URL` from env and pass to page
- **File:** `app/src/routes/(admin)/analytics/umami/+page.server.ts`
- **Effort:** 15min

### 11.5 WARNING: Ko-fi page save not wired
- [ ] **Add onclick handler** to Save button in `app/src/routes/(admin)/integrations/kofi/+page.svelte`
- Should POST to `/api/integrations/kofi/config` with webhookUrl + verificationToken
- **File:** `app/src/routes/(admin)/integrations/kofi/+page.svelte`
- **Effort:** 30min

### 11.6 WARNING: Plugin pages are JSON dumps
- [ ] **Build proper UI** for `app/src/routes/(admin)/social/[...path]/+page.svelte` — replace `<pre>JSON.stringify</pre>` with real components
- [ ] **Build proper UI** for `app/src/routes/(admin)/shop/[...path]/+page.svelte` — same
- **Files:** `app/src/routes/(admin)/social/`, `app/src/routes/(admin)/shop/`
- **Effort:** ~4h (2h per section)

### 11.7 WARNING: Cookies not proxied
- [ ] **Add cookie forwarding** to `app/src/routes/api/[plugin]/[...path]/+server.ts`
- Forward `cookie` header alongside `content-type` and `authorization`
- **File:** `app/src/routes/api/[plugin]/[...path]/+server.ts`
- **Effort:** 15min

### 11.8 FAIL: 7 webs/admin features not migrated
These are the unique features from webs/admin that must be ported to hiai-admin:

#### HIGH Priority
- [ ] **Custom domain management** — DNS verification, CNAME, SSL status pages
  - **Source:** `webs/admin/src/app/sites/[slug]/domain/page.tsx`
  - **Effort:** ~4h
- [ ] **Image upload in editors** — MinIO/S3 upload in TipexEditor
  - **Source:** `webs/admin/src/components/NovelEditor.tsx` (image upload via `/api/admin-proxy/images`)
  - **Effort:** ~3h
- [ ] **Homepage blocks editor** — 6 block types (hero, featured, text, image, cta, newsletter)
  - **Source:** `webs/admin/src/app/sites/[slug]/homepage/page.tsx`, `BlockEditor.tsx`, `BlocksManager.tsx`
  - **Effort:** ~6h
- [ ] **Full analytics dashboard** — 5 tabs (overview, pages, sources/UTM, geo countries/cities, devices/browsers/OS)
  - **Source:** `webs/admin/src/app/analytics/[siteId]/page.tsx` (400 lines)
  - **Effort:** ~6h

#### MEDIUM Priority
- [ ] **NOWPayments crypto** — editor block (product name, price, currency, wallet) + site settings
  - **Source:** `webs/admin/src/components/NovelEditor.tsx` (CryptoBlock), `sites/[slug]/settings/page.tsx`
  - **Effort:** ~4h
- [ ] **Newsletter management (Novu)** — subscribers, CSV export, campaigns, config
  - **Source:** `webs/admin/src/app/sites/[slug]/newsletter/page.tsx`
  - **Effort:** ~4h
- [ ] **AI generation config per site** — frequency, topics, sources, writing style, image generation
  - **Source:** `webs/admin/src/app/generation/page.tsx`
  - **Effort:** ~4h

#### LOW Priority
- [ ] **AI design generation** — ai, hue_shift, complementary, triadic methods with version history
  - **Source:** `webs/admin/src/lib/themes.ts` (461 lines)
  - **Effort:** ~4h
- [ ] **Theme presets** — 4 themes (minimal-dynamic, futuristic-glow, organic-vibes, playful-rococo) with WCAG contrast
  - **Source:** `webs/admin/src/lib/themes.ts`
  - **Effort:** ~3h

### 11.9 Pre-existing TS Errors (not from our work)
- 6 errors in `Locals` type — `Property 'user'/'session' does not exist on type 'Locals'`
- **Files:** `app/src/routes/(admin)/+layout.server.ts`, `app/src/routes/+layout.server.ts`
- These existed before our changes — needs `app.d.ts` declaration

---

## Summary (Updated)

| Phase | Description | Effort | Status |
|-------|-------------|--------|--------|
| 0-10 | Original phases | ~106h | See above |
| 11 | Critic audit fixes | ~35h | **NEW** |
| **Total** | | **~141h** | |
