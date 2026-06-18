# TODO — hiai-admin

> 🧭 **Живой статус этого проекта.** Стратегия и план — в корне `projects/`:
> [`HIAI_ADMIN_INTEGRATION_PLAN.md`](../HIAI_ADMIN_INTEGRATION_PLAN.md) +
> [`HIAI_ADMIN_DIFFS.md`](../HIAI_ADMIN_DIFFS.md) (волны W1–W8) +
> [`HIAI_CONVENTIONS.md`](../HIAI_CONVENTIONS.md). Этот файл синхронизируется с ними.
> ⚠️ B1/B2/E13 ниже **уже сделаны в коде** (verify-only) — см. DIFFS §0.

> **Generated:** 2026-06-14 (updated)
> **Goal:** Build central admin panel for the HiAi SaaS platform
> **Stack:** Bun 1.3.14+, Elysia 1.4.28+, Drizzle ORM 0.45.2+, PostgreSQL 18.4 + pgvector, Redis 8.6+, Svelte 5 + SvelteKit 2.60+, shadcn-svelte, TanStack Query + Table, Better Auth, Stripe

---

## Current Status

| Score | Assessment | Date | Verdict |
|-------|-----------|------|---------|
| 8.0/10 | Production Readiness | 2026-06-14 | CONDITIONAL PASS |
| 7.2/10 | Critic Review | 2026-06-14 | CONDITIONAL PASS |
| 7.0/10 | Security Audit (Wave 3) | 2026-06-10 | All critical closed |
| 6.5/10 | Quality Assessment | 2026-05-23 | Dated — current state is better |
| 9.0/10 | Security Audit (initial) | 2026-05-23 | Open-source ready |

**163 backend tests pass (single vitest runner), 0 lint errors, 0 typecheck errors** across backend and frontend.
> **W1 + A1-хвост (2026-06-16):** §0 verify-only сверено по коду (B1/B2/E13 ✅, см. ниже). Тест-фреймворки
> унифицированы на vitest (T8 ✅: удалены 4 legacy `src/__tests__/*` bun:test smoke-дубля,
> `vitest.config` инклудит только `tests/`, `bun run test` = `vitest run`). Добавлены реальные тесты:
> RBAC unit (T5 ✅), Stripe-webhook (T2 ✅), audit-middleware (T3 ✅), rate-limiter (T4 ✅),
> RBAC-middleware (T1 частично ✅). 91→163 теста. См. ⚠️-находку о scope Elysia-хуков ниже.

> **Reference:** полная стратегия — в корневых `../HIAI_ADMIN_INTEGRATION_PLAN.md` + `../HIAI_ADMIN_DIFFS.md`.
> Историю аудитов см. в разделе «📚 Поглощённые документы» внизу файла.

---

## SPRINT PLAN (2026-06-14)

### Sprint 1: WARNs & BLOCKERs (~7.5h)

| # | Task | Effort | Status |
|---|---|------|--------|
| B1 | Fix env validation in `plan.service.ts` | 30min | ✅ DONE |
| B2 | Wire `tenantId` filter in `userService.list()` | 2h | ✅ DONE |
| W1 | Add rate limiter fail-open metric | 1h | ✅ DONE |
| W2 | Fix SSE heartbeat interval leak | 30min | ✅ DONE |
| W3 | Audit middleware error propagation | 1h | ✅ DONE |
| W4 | CORS hardening for development | 30min | ✅ DONE |
| W5 | Error message sanitization | 2h | ✅ DONE |
| W6 | Consistent auth pattern | 2h | ✅ DONE |
| W7 | Extract `trustedOrigins` to env | 30min | ✅ DONE |

### Sprint 2: Testing & Verification (~14h)

| # | Task | Effort | Status |
|---|------|--------|--------|
| T1 | Route integration tests (auth + RBAC + validation) | 4h | 🟡 PARTIAL (auth/users + RBAC-middleware `rbac-middleware.test.ts` 4 теста: 401/super_admin-bypass/403/grant; route-level Zod-reject ещё нет → T7) |
| T2 | Stripe webhook handler tests (mock events) | 3h | ✅ DONE — `tests/integration/webhooks-stripe.test.ts` (8 тестов: paid/failed/updated/deleted + suspend + missing/invalid sig + unhandled) |
| T3 | Audit middleware behavior tests | 1h | ✅ DONE — `tests/integration/audit-middleware.test.ts` (5: record-payload, skip GET/no-user, fail-open+метрика, fail-closed 500) |
| T4 | Rate limiter enforcement tests | 1h | ✅ DONE — `tests/integration/rate-limiter.test.ts` (4: allow+TTL, at-limit, 429+headers, fail-open). ⚠️ см. находку о scope ниже |
| T5 | RBAC permission check tests | 2h | ✅ DONE — `tests/unit/rbac.service.test.ts` (13 тестов: checkPermission/getUserPermissions deny-by-default + guard-rails system-role/not-found/idempotent) |
| T6 | Tenant provisioning flow tests | 2h | ✅ DONE — покрыто `tests/integration/store.test.ts` (provisioning + Stripe customer + audit) |
| T7 | Zod validation rejection tests | 1h | 🟡 PARTIAL (envSchema reject в `config.test.ts`; route-level Zod-reject — нет) |
| T8 | Consolidate test frameworks (bun:test → vitest) | 2h | ✅ DONE — удалены 4 `src/__tests__/*`, единый `vitest run` |

### Sprint 3: Enhancements & Migration (~46h)

| # | Task | Effort | Status |
|---|------|--------|--------|
| E1 | Nonce-based CSP | 4h | ⬜ PENDING |
| E2 | Cursor-based pagination | 4h | ⬜ PENDING |
| E3 | Redis caching (permissions, settings) | 4h | ⬜ PENDING |
| E4 | Centralized error mapping | 2h | ⬜ PENDING |
| E5 | Shared `AdminContext` type (eliminate `as any`) | 3h | ⬜ PENDING |
| E6 | API documentation / OpenAPI spec | 3h | ⬜ PENDING |
| E7 | Request body size limits | 1h | ⬜ PENDING |
| E8 | Proxy route path allowlisting | 2h | ✅ DONE (W2 §2) — `app/src/lib/server/proxy-target.ts` `resolveTarget` (same-origin + http(s) + anti-traversal), подключён в `+server.ts`, 13 тестов |
| E9 | CSRF protection | 2h | ⬜ PENDING |
| E10 | Delete dead `AdminSidebar.svelte` (P11.3) | 5min | ✅ DONE (A4.2) |
| E11 | Umami page server load + Ko-fi save (P11.4, P11.5) | 45min | ✅ DONE (A4.5) — Umami tracking script via root `+layout` (`PUBLIC_UMAMI_URL`+`PUBLIC_UMAMI_WEBSITE_ID`); Ko-fi save wired `PUT /api/integrations/kofi/config` + widget preview |
| E12 | Build proper UI for plugin proxy pages (P11.6) | 4h | ✅ DONE (verify-only) — social/shop уже на DataTable (W3 §4) |
| E13 | Forward cookies in API proxy (P11.7) | 15min | ⬜ PENDING |
| E14 | Migrate 7 webs/admin features (P11.8) | 31h | ⬜ PENDING |

---

## Phase 0 — Foundation

**Goal:** Scaffold project, install deps, configure DB/Redis, set up auth and middleware.

- [x] 0.1 Create `package.json` with all dependencies (bun, elysia, drizzle-orm, zod, stripe, better-auth, ioredis, @tanstack/svelte-query, @tanstack/svelte-table)
- [x] 0.2 Create `tsconfig.json` (ESNext module, bundler resolution, strict)
- [x] 0.3 Create `drizzle.config.ts` pointing to `hiai_admin` database
- [x] 0.4 Create `.env.example` with all required env vars (see README.md)
- [x] 0.5 Create `.gitignore` (node_modules, .env, dist, .svelte-kit)
- [x] 0.6 Set up `src/lib/config.ts` — env-driven configuration with Zod validation
- [x] 0.7 Set up `src/lib/logger.ts` — pino structured logging
- [x] 0.8 Set up `src/lib/redis.ts` — ioredis client with retry, key prefix `hiadmin:`
- [x] 0.9 Set up `src/lib/db.ts` — Drizzle PostgreSQL client with connection pooling
- [x] 0.10 Set up `src/lib/encryption.ts` — AES-256-GCM for credential storage
- [x] 0.11 Set up Better Auth config (`src/auth/`) with Drizzle adapter + TOTP 2FA plugin
- [x] 0.12 Create `src/api/index.ts` — Elysia entry point with CORS, error handler, route mounting
- [x] 0.13 Create `src/api/middleware/auth.ts` — JWT verification + super_admin role check
- [x] 0.14 Create `src/api/middleware/rbac.ts` — permission-based access control middleware
- [x] 0.15 Create `src/api/middleware/audit.ts` — automatic audit logging for CUD operations
- [x] 0.16 Create `src/api/middleware/rateLimiter.ts` — Redis-backed sliding window
- [x] 0.17 Create `src/api/middleware/apiLogger.ts` — request/response logging
- [x] 0.18 Create health check route: `GET /api/health` (DB + Redis connectivity)
- [x] 0.19 Scaffold SvelteKit frontend (`app/`) with Svelte 5, Tailwind v4, shadcn-svelte
- [x] 0.20 Create `app/src/lib/api.ts` — typed fetch wrapper for backend API
- [x] 0.21 Create `app/src/lib/stores/auth.svelte.ts` — auth state management
- [x] 0.22 Create `docker-compose.yml` for hiai-admin-api + hiai-admin-frontend
- [x] 0.23 Create Dockerfiles for both API and frontend

---

## Phase 1 — Core Database Schemas

**Goal:** Define all Drizzle ORM tables and generate initial migration.

- [x] 1.1 `src/db/schema/tenant.ts` — `tenants` table (id, slug, name, email, stripe_customer_id, stripe_account_id, status, plan, settings JSONB, created_at, updated_at)
- [x] 1.2 `src/db/schema/user.ts` — `users` table (id, email, name, avatar_url, role, two_factor_enabled, last_login_at, created_at)
- [x] 1.3 `src/db/schema/user-tenant-access.ts` — `user_tenant_access` table (id, user_id, tenant_id, role, permissions JSONB, created_at)
- [x] 1.4 `src/db/schema/role.ts` — `roles` table (id, name, description, is_system, created_at)
- [x] 1.5 `src/db/schema/permission.ts` — `permissions` table (id, resource, action, description)
- [x] 1.6 `src/db/schema/role-permission.ts` — `role_permissions` table (id, role_id, permission_id)
- [x] 1.7 `src/db/schema/subscription.ts` — `subscriptions` table (id, tenant_id, stripe_subscription_id, plan, status, current_period_start, current_period_end, cancel_at_period_end)
- [x] 1.8 `src/db/schema/invoice.ts` — `invoices` table (id, tenant_id, stripe_invoice_id, amount, currency, status, pdf_url, created_at)
- [x] 1.9 `src/db/schema/setting.ts` — `settings` table (id, key, value, description, updated_at) — global platform config
- [x] 1.10 `src/db/schema/audit-log.ts` — `audit_logs` table (id, actor_id, action, resource, resource_id, metadata JSONB, ip_address, created_at)
- [x] 1.11 `src/db/schema/integration.ts` — `integrations` table (id, name, type, credentials_encrypted, config JSONB, status, created_at)
- [x] 1.12 `src/db/schema/webhook.ts` — `webhooks` table (id, tenant_id, url, events, secret, status, created_at)
- [x] 1.13 Create Drizzle relations for all schemas
- [x] 1.14 Generate and run initial migration (`bun run db:generate`)
- [x] 1.15 Create seed script with default roles, permissions, and super admin user
- [x] 1.16 Seed default permissions matrix (all resource:action combinations)

---

## Phase 2 — API Layer

**Goal:** CRUD routes for all entities with RBAC, audit logging, and validation.

### 2.1 Tenant Module
- [x] 2.1.1 `src/modules/tenant/tenant.service.ts` — CRUD, provisioning, suspension, deletion
- [x] 2.1.2 `src/modules/tenant/provisioning.ts` — create tenant + Stripe customer + welcome email
- [x] 2.1.3 `src/api/routes/tenants.ts` — GET (list, detail), POST (create), PUT (update), DELETE (soft-delete)
- [x] 2.1.4 `src/api/routes/tenants-actions.ts` — POST suspend, POST reactivate, POST change-plan
- [x] 2.1.5 `src/api/validation/tenant.schema.ts` — Zod schemas

### 2.2 User Module
- [x] 2.2.1 `src/modules/user/user.service.ts` — CRUD, role assignment, 2FA management
- [x] 2.2.2 `src/api/routes/users.ts` — GET (list, detail), POST (create), PUT (update), DELETE
- [x] 2.2.3 `src/api/routes/users-roles.ts` — POST assign-role, POST revoke-role
- [x] 2.2.4 `src/api/validation/user.schema.ts` — Zod schemas

### 2.3 RBAC Module
- [x] 2.3.1 `src/modules/rbac/rbac.service.ts` — role CRUD, permission CRUD, role-permission mapping
- [x] 2.3.2 `src/api/routes/roles.ts` — GET (list), POST (create), PUT (update), DELETE
- [x] 2.3.3 `src/api/routes/permissions.ts` — GET (list), POST assign-to-role, DELETE revoke-from-role

### 2.4 Audit Module
- [x] 2.4.1 `src/modules/audit/audit.service.ts` — record, query (filters: actor, action, resource, date range), export
- [x] 2.4.2 `src/api/routes/audit.ts` — GET (list with filters), GET export (CSV)

### 2.5 Settings Module
- [x] 2.5.1 `src/modules/settings/settings.service.ts` — get/set/list global settings
- [x] 2.5.2 `src/api/routes/settings.ts` — GET (list, single), PUT (update)

### 2.6 Integration Module
- [x] 2.6.1 `src/modules/integration/integration.service.ts` — CRUD, credential encryption, status check
- [x] 2.6.2 `src/api/routes/integrations.ts` — GET (list), POST (create), PUT (update), DELETE, POST test-connection

---

## Phase 3 — Billing & Subscriptions

**Goal:** Stripe Billing integration for platform subscriptions and tenant billing.

- [x] 3.1 `src/modules/billing/stripe.service.ts` — Stripe SDK wrapper (create customer, create subscription, manage plans)
- [x] 3.2 `src/modules/billing/subscription.service.ts` — subscription lifecycle (create, upgrade, downgrade, cancel, reactivate)
- [x] 3.3 `src/modules/billing/invoice.service.ts` — invoice listing, PDF download, payment tracking
- [x] 3.4 `src/modules/billing/plan.service.ts` — plan definitions (Free, Pro, Enterprise) with feature matrix
- [x] 3.5 `src/api/routes/billing.ts` — GET plans, GET current subscription, POST subscribe, POST upgrade, POST cancel
- [x] 3.6 `src/api/routes/billing-invoices.ts` — GET invoices, GET invoice/:id/pdf
- [x] 3.7 `src/api/routes/billing-portal.ts` — POST create-portal-session (Stripe Customer Portal redirect)
- [x] 3.8 `src/api/routes/webhooks-stripe.ts` — webhook handler (invoice.paid, invoice.payment_failed, customer.subscription.updated, customer.subscription.deleted)
- [x] 3.9 Trial management (14-day trial, auto-convert to paid)
- [x] 3.10 Grace period handling (7 days after payment failure before suspension)
- [x] 3.11 Platform fee tracking (commission from tenant transactions via Connect)

---

## Phase 4 — Dashboard

**Goal:** Platform overview with key SaaS metrics and real-time data.

- [x] 4.1 `src/modules/analytics/metrics.service.ts` — MRR/ARR calculation, churn rate, LTV, CAC
- [x] 4.2 `src/modules/analytics/tenant-metrics.ts` — active tenants, new tenants, growth rate, tenant distribution by plan
- [x] 4.3 `src/api/routes/analytics.ts` — GET /api/analytics/overview, /api/analytics/mrr, /api/analytics/churn, /api/analytics/tenants
- [x] 4.4 `app/src/routes/dashboard/+page.svelte` — overview page with key metric cards
- [x] 4.5 `app/src/routes/dashboard/+page.server.ts` — load all dashboard metrics
- [x] 4.6 MRR trend chart (LayerChart — line chart, 12 months)
- [x] 4.7 Tenant growth chart (bar chart, monthly new tenants)
- [x] 4.8 Churn rate chart (line chart, monthly)
- [x] 4.9 Revenue breakdown by plan (pie/donut chart)
- [x] 4.10 Recent activity feed (latest audit log entries)
- [x] 4.11 Real-time active tenants count (SSE endpoint)
- [x] 4.12 Quick actions: create tenant, view alerts, manage billing

---

## Phase 5 — Tenant Management UI

**Goal:** Full tenant lifecycle management from the admin panel.

- [x] 5.1 `app/src/routes/tenants/+page.svelte` — tenant list with TanStack Table (sortable, filterable, paginated)
- [x] 5.2 `app/src/routes/tenants/+page.server.ts` — load tenants with pagination params
- [x] 5.3 `app/src/routes/tenants/[id]/+page.svelte` — tenant detail page (info, settings, billing, users)
- [x] 5.4 `app/src/routes/tenants/[id]/+page.server.ts` — load tenant detail with related data
- [x] 5.5 Create tenant modal/form (name, slug, plan, owner email)
- [x] 5.6 Suspend tenant action (confirmation modal, reason input)
- [x] 5.7 Reactivate tenant action
- [x] 5.8 Change plan action (upgrade/downgrade with proration preview)
- [x] 5.9 Tenant settings editor (feature flags, config overrides)
- [x] 5.10 Tenant users list (who has access, their roles)
- [x] 5.11 Tenant billing summary (current plan, next invoice, payment method)
- [x] 5.12 Tenant health indicator (from HiAi Observe — uptime, error rate)

---

## Phase 6 — User Management UI

**Goal:** User administration with role management and 2FA.

- [x] 6.1 `app/src/routes/users/+page.svelte` — user list with TanStack Table
- [x] 6.2 `app/src/routes/users/[id]/+page.svelte` — user detail (profile, roles, tenant access, activity)
- [x] 6.3 Create user form (email, name, role, tenant assignment)
- [x] 6.4 Edit user form (name, avatar, role changes)
- [x] 6.5 Role assignment UI (checkbox matrix for permissions)
- [x] 6.6 2FA management (enable/disable, view status, force reset)
- [x] 6.7 Session management (list active sessions, force logout)
- [x] 6.8 User activity log (last N actions from audit_logs)
- [x] 6.9 Bulk actions (deactivate, change role)

---

## Phase 7 — Billing UI

**Goal:** Billing dashboard with subscription management and invoice history.

- [x] 7.1 `app/src/routes/billing/+page.svelte` — billing overview (current plan, usage, next invoice)
- [x] 7.2 `app/src/routes/billing/+page.server.ts` — load billing data
- [x] 7.3 Plan comparison table (Free vs Pro vs Enterprise features)
- [x] 7.4 Subscription management (upgrade, downgrade, cancel with confirmation)
- [x] 7.5 Invoice history table (TanStack Table with download links)
- [x] 7.6 Stripe Customer Portal redirect button
- [x] 7.7 Platform fee summary (total commission earned, per-tenant breakdown)
- [x] 7.8 Revenue analytics (MRR trend, ARPU, plan distribution)

---

## Phase 8 — Security & Audit UI

**Goal:** Audit log viewer, session management, and security settings.

- [x] 8.1 `app/src/routes/security/+page.svelte` — security overview (2FA status, active sessions, recent alerts)
- [x] 8.2 `app/src/routes/security/audit/+page.svelte` — audit log viewer (TanStack Table with filters)
- [x] 8.3 Audit log filters (actor, action, resource, date range, IP address)
- [x] 8.4 Audit log export (CSV download)
- [x] 8.5 Session management (list all active sessions, force terminate)
- [x] 8.6 Security settings (require 2FA for all admins, session timeout, IP allowlist)
- [x] 8.7 Login history (successful/failed attempts)

---

## Phase 9 — Settings & Integrations UI

**Goal:** Platform configuration and third-party service management.

- [x] 9.1 `app/src/routes/settings/+page.svelte` — global settings editor (key-value with sections)
- [x] 9.2 Settings sections: General (name, URL, timezone), Email (SMTP, templates), Features (flags), Limits (rate limits, quotas)
- [x] 9.3 `app/src/routes/integrations/+page.svelte` — integration list with status indicators
- [x] 9.4 Integration detail page (credentials, config, test connection, health)
- [x] 9.5 Stripe integration setup (API key input, webhook secret, test mode toggle)
- [x] 9.6 Shippo/Easyship integration setup
- [x] 9.7 HiAi Observe integration setup (URL, DSN, status check)
- [x] 9.8 Novu integration setup (API key, notification templates)
- [x] 9.9 Webhook management (create, edit, delete, test fire)

---

## Phase 10 — Polish & Production

### Testing
- [ ] **10.1** Unit tests for RBAC service (permission checks, role hierarchy) → T5
- [ ] **10.2** Unit tests for audit service (recording, querying, export) → T3
- [ ] **10.3** Unit tests for billing service (subscription lifecycle, invoice generation) → see T2
- [ ] **10.4** Unit tests for tenant provisioning (create + Stripe + email flow) → T6
- [ ] **10.5** Integration tests for all CRUD routes (auth, RBAC, audit logging) → T1
- [ ] **10.6** Integration tests for Stripe webhooks (mock events) → T2
- [ ] **10.7** API route tests (auth, rate limiting, validation, error handling) → T1, T4, T7

### Documentation
- [x] **10.8** API documentation (endpoint reference, request/response examples) — basic README overview
- [x] **10.9** Admin onboarding guide (first-time setup, creating super admin) — README.md
- [x] **10.10** Developer setup guide — README.md, CONTRIBUTING.md, DEVELOPMENT-GUIDE.md (NEW)
- [ ] **10.10** API docs / OpenAPI spec → E6

### Docker & Deployment
- [x] 10.11 Multi-stage Dockerfiles (build → production image)
- [x] 10.12 Docker health checks for all services
- [ ] 10.13 `.dockerignore` files → E14 (if needed)
- [ ] 10.14 Caddy route configuration for admin domains

### Security
- [x] 10.15 Input sanitization audit (Zod schemas on all endpoints)
- [ ] 10.16 CORS configuration (admin domain only) → W4
- [ ] 10.17 Rate limit tuning per endpoint tier → W1, T4
- [x] 10.18 Stripe webhook signature verification
- [x] 10.19 SQL injection audit (all queries parameterized via Drizzle)
- [ ] 10.20 CSRF protection for state-changing operations → E9
- [ ] 10.21 Content Security Policy headers → CSP exists (report-only), needs nonce evolution → E1

### Performance
- [ ] 10.22 Pagination for all list endpoints (cursor-based) → E2
- [ ] 10.23 Redis caching for frequently accessed data (settings, permissions) → E3
- [ ] 10.24 SSR performance audit (SvelteKit load functions) → E14 (if needed)
- [ ] 10.25 TanStack Query cache invalidation strategy → E14 (if needed)

### Pre-Existing App Issues (Discovered, Not From Current Pass)
- [ ] Fix `app/src/lib/components/StatusBadge.svelte` — unused `style` and `sizeStyle` variables
- [ ] Fix 57+ a11y warnings in svelte-check (label-without-control, div-with-click-without-keyboard)
- [ ] Resolve 5 svelte-check errors (mainly `Locals` type — `Property 'user'/'session' not found`)
- [ ] Fix 48 a11y/svelte warnings in svelte-check
- [ ] Fix `/mnt/ai_data/packages/hiai-ui/src/index.ts` — references deleted `AdminSidebar.svelte`, `AdminHeader.svelte` (8 missing imports)
- [ ] Fix `app/node_modules/layerchart/dist/utils/index.d.ts` — missing declaration for `./canvas.js`
- [ ] 17 `as any` casts across 7 files (Elysia type system workaround)
- [ ] Dual validation (Zod + TypeBox) — defensive but redundant
- [ ] No centralized error mapping — services return 400 for all errors

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

### 11.3 WARNING: Dead local AdminSidebar.svelte → E10
- [ ] **Delete** `app/src/lib/components/AdminSidebar.svelte` (54 lines) — layout uses @hiai/ui, this is dead code
- **File:** `app/src/lib/components/AdminSidebar.svelte`
- **Effort:** 5min

### 11.4 WARNING: Umami page missing server load → E11
- [ ] **Create** `app/src/routes/(admin)/analytics/umami/+page.server.ts`
- Should load `UMAMI_URL` from env and pass to page
- **File:** `app/src/routes/(admin)/analytics/umami/+page.server.ts`
- **Effort:** 15min

### 11.5 WARNING: Ko-fi page save not wired → E11
- [ ] **Add onclick handler** to Save button in `app/src/routes/(admin)/integrations/kofi/+page.svelte`
- Should POST to `/api/integrations/kofi/config` with webhookUrl + verificationToken
- **File:** `app/src/routes/(admin)/integrations/kofi/+page.svelte`
- **Effort:** 30min

### 11.6 WARNING: Plugin pages are JSON dumps → E12
- [ ] **Build proper UI** for `app/src/routes/(admin)/social/[...path]/+page.svelte` — replace `<pre>JSON.stringify</pre>` with real components
- [ ] **Build proper UI** for `app/src/routes/(admin)/shop/[...path]/+page.svelte` — same
- **Files:** `app/src/routes/(admin)/social/`, `app/src/routes/(admin)/shop/`
- **Effort:** ~4h (2h per section)

### 11.7 WARNING: Cookies not proxied → E13
- [ ] **Add cookie forwarding** to `app/src/routes/api/[plugin]/[...path]/+server.ts`
- Forward `cookie` header alongside `content-type` and `authorization`
- **File:** `app/src/routes/api/[plugin]/[...path]/+server.ts`
- **Effort:** 15min

### 11.8 FAIL: 7 webs/admin features not migrated → E14
These are the unique features from webs/admin that must be ported to hiai-admin:

#### HIGH Priority
- [ ] **Custom domain management** — DNS verification, CNAME, SSL status pages
  - **Source:** `webs/admin/src/app/sites/[slug]/domain/page.tsx`
  - **Effort:** ~4h
  - **Task:** E14a
- [ ] **Image upload in editors** — MinIO/S3 upload in TipexEditor
  - **Source:** `webs/admin/src/components/NovelEditor.tsx` (image upload via `/api/admin-proxy/images`)
  - **Effort:** ~3h
  - **Task:** E14b
- [ ] **Homepage blocks editor** — 6 block types (hero, featured, text, image, cta, newsletter)
  - **Source:** `webs/admin/src/app/sites/[slug]/homepage/page.tsx`, `BlockEditor.tsx`, `BlocksManager.tsx`
  - **Effort:** ~6h
  - **Task:** E14c
- [ ] **Full analytics dashboard** — 5 tabs (overview, pages, sources/UTM, geo countries/cities, devices/browsers/OS)
  - **Source:** `webs/admin/src/app/analytics/[siteId]/page.tsx` (400 lines)
  - **Effort:** ~6h
  - **Task:** E14d

#### MEDIUM Priority
- [ ] **NOWPayments crypto** — editor block (product name, price, currency, wallet) + site settings
  - **Source:** `webs/admin/src/components/NovelEditor.tsx` (CryptoBlock), `sites/[slug]/settings/page.tsx`
  - **Effort:** ~4h
  - **Task:** E14e
- [ ] **Newsletter management (Novu)** — subscribers, CSV export, campaigns, config
  - **Source:** `webs/admin/src/app/sites/[slug]/newsletter/page.tsx`
  - **Effort:** ~4h
  - **Task:** E14f
- [ ] **AI generation config per site** — frequency, topics, sources, writing style, image generation
  - **Source:** `webs/admin/src/app/generation/page.tsx`
  - **Effort:** ~4h
  - **Task:** E14g

#### LOW Priority
- [ ] **AI design generation** — ai, hue_shift, complementary, triadic methods with version history
  - **Source:** `webs/admin/src/lib/themes.ts` (461 lines)
  - **Effort:** ~4h
- [ ] **Theme presets** — 4 themes (minimal-dynamic, futuristic-glow, organic-vibes, playful-rococo) with WCAG contrast
  - **Source:** `webs/admin/src/lib/themes.ts`
  - **Effort:** ~3h

### 11.9 Pre-existing TS Errors (not from our work)
- [ ] 6 errors in `Locals` type — `Property 'user'/'session' does not exist on type 'Locals'`
- **Files:** `app/src/routes/(admin)/+layout.server.ts`, `app/src/routes/+layout.server.ts`

---

## Phase 12: Dependency & Documentation Pass (2026-06-14)

> **Source:** SECURITY-AUDIT-WAVE3.md §4 (dependency audit), this pass
> **Result:** Critical vitest vuln closed; 2 BLOCKER-1/2 remain in code; PRODUCTION-READINESS.md created

### 12.1 Backend Dependency Updates — ✅ COMPLETED
- [x] `bun update` in `backend/` — vitest ^2.1.0 → ^4.1.8 (CRITICAL GHSA-5xrq-8626-4rwp fixed)
- [x] `bun update` in `backend/` — vite ^6.4.1 → ^8.0.16 (MODERATE GHSA-4w7w-66w2-5vf9 fixed, promoted to direct dep)
- [x] `bun update` in `backend/` — esbuild → ^0.28.1 (dev-only, transitive-fixed)
- [x] `bun update` in `backend/` — drizzle-kit 0.31.0 → 0.31.10, stripe 14.10 → 14.25, zod 3.24 → 3.25.76, typescript 5.7 → 5.9, biome 2.4.16 → 2.5.0, better-auth 1.6.16 → 1.6.18
- **Verification:** 86/86 vitest tests pass, 18/18 bun:test pass, 0 typecheck errors, 0 lint errors
- **Audit:** 5 vulns (1 critical, 1 high, 2 moderate, 1 low) → 3 vulns (1 high, 1 moderate, 1 low) — all dev-only esbuild transitive

### 12.2 Frontend Dependency Updates — ✅ COMPLETED
- [x] `bun update` in `app/` — @sveltejs/kit 2.60 → 2.65.1
- [x] `bun update` in `app/` — @tiptap/* 3.18/3.23 → 3.26.1, layerchart 1.0.0 → 1.0.13
- [x] `bun update` in `app/` — svelte 5.55 → 5.56.3, vite 6.0 → 6.4.3, typescript 5.7 → 5.9.3
- **Audit:** 7 vulns → 7 vulns (all inherited via workspace packages — out of scope)

### 12.3 Documentation — ✅ COMPLETED
- [x] **Created** `PRODUCTION-READINESS.md` (7.4/10 CONDITIONAL PASS) — references QUALITY-ASSESSMENT, SECURITY-AUDIT-WAVE3, CRITIC-REVIEW

### 12.4 Cross-Project Vulnerabilities (Out of Scope)
- [ ] **Fix in `/mnt/ai_data/packages/mastra-kit/`** — `ai <5.0.52` (^3.0.0), `jsondiffpatch <0.7.2`, `@ai-sdk/provider-utils <=3.0.97` (^1.0.0)
- **Effort:** ~2h (bump 4 direct deps, verify @mastra/core peer compatibility)
- **Owner:** mastra-kit package maintainer
- [ ] **Fix in `/mnt/ai_data/packages/hiai-ui/`** — `cookie <0.7.0` via `@sveltejs/kit` peer
- **Effort:** ~30min (bump @sveltejs/kit peer to ^2.65.0)
- **Owner:** hiai-ui package maintainer

---

## Phase 13: BLOCKERs (Code Changes)

> **Source:** CRITIC-REVIEW.md §Critical Blockers + PRODUCTION-READINESS.md

### ✅ BLOCKER-1 — `plan.service.ts` env validation → B1 (DONE, verified 2026-06-16)
- [x] `STRIPE_PRO_PRICE_ID` + `STRIPE_ENTERPRISE_PRICE_ID` в `envSchema` (`config.ts:53-54`, `.optional()`)
- [x] `plan.service.ts:45,66` читает `env.STRIPE_*` (не `process.env`)
- **Note:** переменные `.optional()` — поведение graceful (нет fail-fast); `config.test.ts` характеризует optional-дизайн. План A1.1 ошибочно требовал fail-fast-тест — НЕ применимо.

### ✅ BLOCKER-2 — `userService.list()` tenantId filter → B2 (DONE, verified 2026-06-16)
- [x] `userService.list()` фильтрует по `tenantId` через `userTenantAccess`, early-return `[]` при пустом scope (anti-enumeration) — `user.service.ts:44-60`
- [x] Покрыто: `tests/unit/user.service.test.ts` + `tests/integration/users.test.ts` (5 isolation-тестов)

---

## Phase 14: Documentation & Planning Pass (2026-06-14)

> Created comprehensive development guide and task plan.

### 14.1 Documentation — ✅ COMPLETED
- [x] **Created** `DEVELOPMENT-GUIDE.md` (924 lines) — project overview, architecture, current status, all known issues, file location map, step-by-step fix guides, testing commands, deployment checklist
- [x] **Created** `TASK-PLAN.md` (801 lines) — 31 tasks organized into 3 sprints with clear titles, descriptions, file references, effort estimates, dependencies, and verification steps
- [x] **Updated** `todo.md` — current status section, sprint plan table, cross-references to new task IDs (B1, B2, W1-W7, T1-T8, E1-E14), all phases marked with completion status

### 14.2 Files Created
| File | Lines | Purpose |
|------|-------|---------|
| `DEVELOPMENT-GUIDE.md` | 924 | Comprehensive development guide |
| `TASK-PLAN.md` | 801 | Detailed task plan with sprint assignments |

### 14.3 Files Modified
| File | Change |
|------|--------|
| `todo.md` | Updated with current status, sprint plan, new task IDs |

---

## Summary

| Phase | Description | Effort | Status |
|-------|-------------|--------|--------|
| 0 | Foundation | ~8h | ✅ **DONE** |
| 1 | Core Database Schemas | ~6h | ✅ **DONE** |
| 2 | API Layer | ~14h | ✅ **DONE** |
| 3 | Billing & Subscriptions | ~12h | ✅ **DONE** |
| 4 | Dashboard | ~10h | ✅ **DONE** |
| 5 | Tenant Management UI | ~10h | ✅ **DONE** |
| 6 | User Management UI | ~8h | ✅ **DONE** |
| 7 | Billing UI | ~8h | ✅ **DONE** |
| 8 | Security & Audit UI | ~6h | ✅ **DONE** |
| 9 | Settings & Integrations UI | ~8h | ✅ **DONE** |
| 10 | Polish & Production | ~16h | 🟡 **PARTIAL** (testing gaps remain) |
| 11 | Critic audit fixes | ~35h | 🟡 **PARTIAL** (migration items remain) |
| 12 | Dep updates + PRODUCTION-READINESS.md | ~1h | ✅ **DONE** |
| 13 | BLOCKER-1/2 code fixes | ~2.5h | 🔴 **PENDING** (B1, B2) |
| 14 | Documentation & planning | ~2h | ✅ **DONE** |
| **Sprint 1** | WARNs & BLOCKERs | ~7.5h | 🟡 **PENDING** |
| **Sprint 2** | Testing & Verification | ~14h | ⬜ **PENDING** |
| **Sprint 3** | Enhancements & Migration | ~46h | ⬜ **PENDING** |

---

## 📚 Поглощённые документы (история аудитов)

> Ниже — выжимка из 7 отдельных аудит/план/ревью-документов, слитых сюда 2026-06-16
> и удалённых из репозитория. Полный текст любой версии — в истории git.
> Стратегический трекинг открытых пунктов — в корневых `../HIAI_ADMIN_INTEGRATION_PLAN.md`
> и `../HIAI_ADMIN_DIFFS.md`.

### Скоркарты (на даты аудитов)
| Документ | Оценка | Дата | Вердикт |
|---|---|---|---|
| PRODUCTION-READINESS.md | 8.0/10 | 2026-06-14 | CONDITIONAL PASS |
| CRITIC-REVIEW.md | 7.2/10 | 2026-06-14 | CONDITIONAL PASS |
| SECURITY-AUDIT-WAVE3.md | 7.0/10 | 2026-06-10 | все critical закрыты |
| QUALITY-ASSESSMENT.md | 6.5/10 | 2026-05-23 | устарела — состояние лучше |
| SECURITY-AUDIT.md | 9.0/10 | 2026-05-23 | open-source ready |
| DEVELOPMENT-GUIDE.md | — | 2026-06-14 | синтез всех 11 доков (архитектура, схема БД, how-to-fix) |
| TASK-PLAN.md | — | 2026-06-14 | спринт-разбивка задач |

### Что уже ИСПРАВЛЕНО в коде (verify-only, см. DIFFS §0)
- **BLOCKER-1** — `plan.service.ts` теперь читает `env.STRIPE_PRO/ENTERPRISE_PRICE_ID` (envSchema, config.ts:55-56).
- **BLOCKER-2** — `userService.list()` применяет `tenantId`-фильтр (user.service.ts:46-60, anti-enumeration).
- **E13** — миграция блоков homepage / SSO-каркас закрыты на критическом пути.

### Остаточные открытые пункты (мелочь, не в стратегических планах)
- **WARN-1** rate-limiter fail-open без метрики (`rateLimiter.ts:42`, ~1h)
- **WARN-2** SSE heartbeat `setInterval` не очищается при disconnect (`events.ts`, ~30m)
- **WARN-3** audit middleware глотает ошибки — CUD проходит при сбое аудита (`audit.ts:32-34`, ~1h)
- **WARN-4** CORS `origin:'*'` в dev (`api/index.ts:31`, ~30m)
- **WARN-5** `error.message` уходит клиенту — централизовать error mapping (`lib/errors.ts`, ~2h)
- **WARN-6** непоследовательный auth: `tenants.ts`/`analytics.ts` на ручном `loadSession()` вместо `authMiddleware` (~2h)
- **WARN-7** `trustedOrigins` с хардкод-портами 50202/50203 → в env (`auth/index.ts:16-18`, ~30m)
- **Testing gaps (обновлено 2026-06-16):** ✅ Stripe-webhook (T2), ✅ RBAC-checks (T5), ✅ tenant-provisioning (T6 — store.test.ts), ✅ консолидация bun:test→vitest (T8), ✅ audit-middleware (T3), ✅ rate-limiter (T4), ✅ RBAC-middleware (часть T1). Остаётся: route-level Zod-reject через смонтированные роуты (T7) + полноценные route-integration с реальными роут-плагинами (T1 хвост).
- **✅ ИСПРАВЛЕНО (scope Elysia hooks, 2026-06-16):** баг подтверждён регресс-тестом — `createRateLimiter`/`auditMiddleware` (named-плагины) в **local-scope** НЕ применялись к роут-плагинам-сиблингам в `api/index.ts` → rate-limit и audit де-факто не enforced. Фикс: `{ as: 'scoped' }` на `.derive` (`rateLimiter.ts`) и `.onAfterHandle` (`audit.ts`). Регресс-тест `tests/integration/middleware-scope-bug.test.ts` доказывает enforcement на sibling-роутах.
- **W2 (2026-06-16, динамические Site adapters + anti-SSRF, всё в upstream-ядре; backend typecheck 0/165 тестов, app svelte-check 0 errors/94 теста):**
  - ✅ §2 anti-SSRF: `app/src/lib/server/proxy-target.ts` `resolveTarget` (same-origin+http(s)+anti-traversal, 13 тестов) → в catch-all `+server.ts` (400). (=E8)
  - ✅ §3.1 тип `SiteAdapter` (`app/src/lib/plugins/types.ts`).
  - ✅ §3.2 схема `site_adapters` (`backend/src/db/schema/site-adapter.ts`, tenant FK cascade, `jwtSecretEncrypted`) + relations + миграция `drizzle/0002_brief_mastermind.sql` (нужен `db:push`).
  - ✅ §3.3 динамическая регистрация: backend `GET /api/site-adapters` (sanitized DTO, super_admin) + app `buildSiteAdapterPlugins` (8 тестов) + `(admin)/+layout.server.ts`/`+layout.svelte`.
  - ✅ §3.4 UI «Подключить сайт» (W3, 2026-06-16): backend `POST /api/site-adapters` (zod + health-gate + encrypt секрета) и `POST /check-health` (timeout 5s); сервис `create`/`checkHealth` (8 unit-тестов); app `(admin)/sites/connect/+page.{server.ts,svelte}` (форма tenant/name/slug/backendUrl/auth/modules/jwtSecret + кнопка Test); nav-пункт «Connect Site»; **добавлена недостающая vite-proxy запись `/api/site-adapters`** (без неё §3.3-фетч молча падал в dev). backend 173 теста / app svelte-check 0 errors.
  - ✅ §4 нативный UI плагинных страниц (E12) — **verify-only: уже сделано**. `shop/[...path]` и `social/[...path]/+page.svelte` используют `DataTable` с секционными колонками/форматтерами/empty+error-состояниями (НЕ `<pre>JSON</pre>`). План §4/E12 устарел. ⚠️ Наблюдение: server `return { title, ...data }`, а страница читает `extractArray(data.data)` — при не-вложенном ответе бэкенда таблица пуста; проверить shape при интеграции.
  - ✅ §12 минт backend-JWT / SSO-механизм B0.2 (W4, 2026-06-16): `app/src/lib/server/backend-token.ts` `mintBackendToken` — HS256 через `node:crypto` (без `jose`), claims `{sub,email,role,iat,exp1h}`, role-map `site_admin→editor/admin→admin/super_admin→super_admin` — **точно формат webs** (`webs/admin/src/lib/{jwt,backendAuth}.ts`, alg HS256, `JWT_SECRET`). **10 unit-тестов**. Подключён в proxy `+server.ts`: для `auth:'jwt'` минтит токен из `locals.user`, иначе форвардит креды (не ломает api-key/legacy).
    - ✅ **Источник секрета (резолв рассинхрона, 2026-06-16):** БД — источник истины. `siteAdapterService.getSigningSecret(slug)` расшифровывает `jwtSecretEncrypted` **server-side** (3 unit-теста); app `$lib/server/adapter-secret.ts` зовёт его in-process (как `hooks.server.ts` тянет `auth` из backend — секрет не пересекает сеть), с **env-fallback** (`SITE_ADAPTER_JWT_SECRET_<SLUG>` → `WEBS_BACKEND_JWT_SECRET`) для seed/`.env.webs`-деплоев. Секрет из connect-мастера теперь реально используется proxy.
    - ⬜ Прототип `webs/admin/scripts/sso-smoke.ts` (нужен живой стек webs↔admin) — отдельно.
- **B1 — Статьи (вторая ступень интеграции в webs, 2026-06-16, всё в upstream-ядре как generic `articles`-модуль Site adapter; webs-специфика — только в seed/конфиге адаптера. app: svelte-check 0 errors, 121 теста):**
  - ✅ Pure-логика `app/src/lib/sites/articles.ts` (TDD, 17 тестов `tests/unit/articles.test.ts`): `extractArticles` (unwrap items/data/articles/results/posts), `normalizeArticle` (фолбэки title/status/language/slug/updatedAt/content + snake_case/alt-keys + coerce id), `STATUS_OPTIONS`/`statusLabel`, `buildBulkStatusBody` (guard пустой выборки/невалидного статуса), `validateArticleDraft` (title required; publish требует content).
  - ✅ B1.1 Список: `(admin)/sites/[slug]/articles/+page.{server.ts,svelte}` — load через `/api/{slug}/articles` (+ best-effort `/articles/drafts/count`), select-all + per-row чекбоксы, bulk-status бар (action `?/bulkStatus` → `POST /api/{slug}/articles/bulk-status`), колонки title/status(бейдж)/language/updated, кнопка New, Edit-ссылки. Нав уже роутит сюда (MODULE_NAV.articles).
  - ✅ B1.2+B1.4 Редактор: `(admin)/sites/[slug]/articles/[id]/+page.{server.ts,svelte}` — `id='new'`=создание; `TipexEditor` (`@hiai/ui`), поля title/slug/status/**language** (datalist), action `?/save` (POST/PUT по new/id) с `validateArticleDraft`-гейтом, redirect на список.
  - ✅ B1.3 Вставка картинок: кнопка → `POST /api/{slug}/images` (multipart) → URL → append `![name](url)` в markdown (через content-prop TipexEditor, который синкает внешний content через `$effect`+`setContent`).
  - **Контракт сайт-бэкенда** (проксируется): `GET/POST /articles`, `GET/PUT /articles/:id`, `POST /articles/bulk-status`, `GET /articles/drafts/count`, `POST /images`. webs мапит свои `admin-proxy/*` в копии-инстансе (Блок B seed), ядро не трогает.
  - ⬜ Live-проверка против webs-бэкенда (`:50100`) — на этапе B0.5 (живой стек).
- **B2 — Конструктор сайта + B3 — Ko-fi (2026-06-16, параллельно через 2 Haiku-агента, координация + интеграционная проверка — мной; всё generic-модули ядра. Итог: app svelte-check 0 errors, vitest 201 теста (+80), backend не тронут 176):**
  - ✅ **B2** pure-логика (TDD): `app/src/lib/sites/homepage.ts` (30 тестов: BLOCK_TYPES hero/featured/text/image/cta/newsletter, `extractBlocks` sort-by-order, `normalizeBlock` fallbacks, `newBlock` uuid, `validateBlock` per-type, `reorder` re-sequence+clamp, `buildReorderBody`) + `app/src/lib/sites/domains.ts` (16 тестов: `normalizeDomains`, `domainStatusTone` ok/pending/error, `statusLabel`).
  - ✅ **B2.1** sites overview/detail: `(admin)/sites/+page.*` (список адаптеров через `/api/site-adapters`), `(admin)/sites/[slug]/+page.*` (инфо + **B2.3 settings**-форма `GET/PUT /api/{slug}/settings`, быстрые ссылки на модули).
  - ✅ **B2.2** homepage-blocks editor: `(admin)/sites/[slug]/homepage/+page.*` — add/edit/move(reorder)/delete 6 типов блоков, save `PUT /api/{slug}/homepage-blocks` (hidden JSON), `validateBlock`-гейт.
  - ✅ **B2.4** домены: `(admin)/sites/[slug]/domain/+page.*` — таблица доменов со статус-бейджами (DNS/SSL/verified), add `POST /api/{slug}/domains`, verify `POST /api/{slug}/domain/{d}/verify`, CNAME.
  - ⬜ **B2.5** темы/пресеты — пропущено (опционально; AI-генерация вне B2).
  - ✅ **B3** Ko-fi: pure-логика `app/src/lib/sites/kofi.ts` (34 теста: `normalizeKofiConfig` snake_case/fallbacks, `validateKofiConfig` http(s)+token при enabled, `extractDonations` sort-desc, `formatAmount` $/€/£) + страница `(admin)/sites/[slug]/kofi/+page.*` — конфиг-форма (`?/saveConfig` → `GET/PUT /api/{slug}/kofi/config`, валидация) + таблица донатов (`GET /api/{slug}/kofi/donations`).
  - **Контракты сайт-бэкенда** (generic, webs мапит в seed копии): `GET/PUT /settings`, `GET/PUT /homepage-blocks`, `GET/POST /domains` + `/domain/{d}/verify`, `GET/PUT /kofi/config`, `GET /kofi/donations`.
  - Интеграционные фиксы координатора: убран несуществующий импорт `normalizeDonation` в `kofi.test.ts`; типизирован `.find((a:{slug}))` и `String(block.data.text)`, placeholder `{'{}'}` в B2-страницах (3 svelte-check ошибки → 0).
  - ⬜ Live-прогон B2/B3 против сайт-бэкенда — этап B0.5 (живой стек).
- **Pre-integration hardening + каркас B0.5 (2026-06-16, 3 Haiku-агента под координацией; backend 198 тестов, app 0 errors/208 тестов — оба перепроверены независимо):**
  - ✅ **E7** лимит тела запроса → 413: `backend/src/api/middleware/bodyLimit.ts` (env `MAX_BODY_BYTES`, дефолт 1 МБ), 6 тестов, `{as:'scoped'}`.
  - ✅ **E9** CSRF/origin-guard на state-changing → 403: `backend/src/api/middleware/csrf.ts` (allowlist из `BETTER_AUTH_TRUSTED_ORIGINS`; GET/HEAD + Bearer + бес-cookie пропускаются — proxy-путь не ломается), 18 тестов, `{as:'scoped'}`, подключены в `api/index.ts`.
  - ✅ **A1.3** типы `App.Locals`: `SessionUser` в `app.d.ts`, убран inline-каст в proxy `+server.ts`.
  - ✅ **A2.6** proxy header-whitelist: `tests/unit/proxy-headers.test.ts` (7 тестов) — подтверждено, что форвардятся только content-type/authorization/cookie (свежий `Headers()`, без утечки x-forwarded/host/etc).
  - ✅ Гашение `state_referenced_locally` в новых sites-страницах через `untrack()` (warnings 50→45).
  - ✅ **Каркас B0.5** в `projects/webs/hiai-admin/` (не запущен, прод не тронут): `README.md`, `docker-compose.webs.yml` (тот же upstream-код, своя БД/Redis, сети webs+ai-internal, параллельно легаси), `.env.webs.example` (общие JWT_SECRET/BETTER_AUTH_SECRET), `seed/webs-site-adapters.ts` (16 сайтов = per-site tenant), `Caddyfile.snippet` (параллельный `/webs/admin-next/*`), `BEFORE-INTEGRATION.md` (чеклист), `CONTRACT-MAP.md` (карта generic↔webs).
- **Контракт-интеграция hiai-admin↔webs ЗАКРЫТА в коде (2026-06-16, курс: webs=эталонный потребитель, правим оба проекта напрямую; 5 Haiki-сабов + координатор). app 0 errors/214 тестов, backend 198, webs-backend 0 TS-ошибок в тронутых файлах:**
  - ✅ Stage 0 (координатор): proxy форвардит query-строку; статьи list/bulk/drafts выровнены; webs `/admin/list` +`?site=`.
  - ✅ Статьи (саб A + координатор): редактор GET/PUT `/articles/:id`, create POST `/articles` c `site` slug; картинки `POST /images/upload` (поле `image`+`site`). webs create/images принимают `site` slug (аддитивно, координатор).
  - ✅ Homepage (саб B): webs `GET /homepage-blocks/admin/site-by-slug/:slug` (аддитивно, +auth guard координатором), reorder `[{id,order_index}]`.
  - ✅ Домены (саб C): verify по numeric id, маппинг webs-статусов, `?site=` фильтр; webs GET/POST `/domains` принимают slug (аддитивно).
  - ✅ Settings+Ko-fi (саб D): settings→`/sites/:slug`, ko-fi→`config.kofi` (`kofi_enabled`/`kofi_url`), donations→пустой стейт (в webs не хранятся). Zero webs-правок.
  - **Все webs-правки аддитивны, только dead admin-роуты; live-фронт webs не тронут.** Конвенция: адаптер `backendUrl=http://webs-api:3001/api/v1`.
  - ⬜ Остаётся Stage 3 (live, нужен стенд): compose up + db:push/seed + сверка JWT_SECRET + SSO-smoke + Caddy `/webs/admin-next/*` + пилот croco. Доки: `projects/webs/hiai-admin/{INTEGRATION-PLAN,CONTRACT-MAP,BEFORE-INTEGRATION}.md`.
  - 🔴 **(исходный) БЛОКЕР #1 — контракт-маппинг (карта снята):** webs-ручки под `/api/v1`, нужен rewrite-слой (не один base URL). Расхождения: articles list→`/admin/list`, homepage-blocks нужен numeric `siteId`, domain verify по id, bulk-status `ids→articleIds`, drafts `?site=` + `{draftCount}`, **ko-fi = поля настроек сайта (нет ручек), donations в webs не хранятся**. План: generic declarative endpoint-map в ядре (apiBase/siteId/pathMap на адаптере — webs-специфика в seed) + тонкий webs-facade `/api/v1/admin-adapter/*` для трансформаций/пробелов. Детали — `CONTRACT-MAP.md`. **Решение по объёму — за пользователем.**
- **Stage 3 LIVE стенд + прод-блокеры + RBAC (2026-06-17/18). app 0 errors, backend typecheck 0:**
  - ✅ **Миграции** (блокер #1) починены: `tenant_id`→uuid во всех таблицах (`0000`), убран битый ALTER (`0002`). `bun run db:migrate` на чистой БД → 18 таблиц, exit 0.
  - ✅ **Прод-сборка** (блокер #2): app переведён на `@sveltejs/adapter-node`; `bun run build` (app+backend) собирается и **запускается** (app `/login` 200, backend health 200). Потребовалось: `vite.config ssr.external` для node-deps бэкенда (pino/postgres/ioredis/better-auth/drizzle/elysia/stripe…) + **эти deps добавлены в `app/package.json`** (app бандлит backend in-process). ⚠️ Для Docker-образа: app build-контекст должен видеть `backend/`; app-образ несёт backend-deps. Bun-workspace hoisting усложняет COPY node_modules → образ собирать с `bun install` в контейнере (TODO).
  - ✅ **Общие контейнеры** (решение пользователя): hiai-admin-данные в **webs-postgres** (БД `hiai_admin`, отдельная от `webs`) + **webs-redis** (пароль). Стенд: dev-процессы на хосте (backend :50200, app vite :50250) подключены к общим контейнерам через socat-форвардеры `hiai-admin-pgfwd`/`redisfwd` (host 55432/56379). Прод-образ на сети `webs_webs` — TODO.
  - ✅ **Site-edit** (паритет со старой админкой): `(admin)/sites/[slug]/edit/+page.{server,svelte}` — name/description/status/theme через `GET/PUT /sites/:slug` (slug immutable; plan — tenant-уровень, тут не редактируется). Кнопка «Edit site» на детальной. Проверено live (PUT 200).
  - ✅ **RBAC 2 уровня (частично):** guard `(admin)/+layout.server.ts` пускает `super_admin` (глобал) + `admin`/`editor` (сайт-админ); `/sites` скоупит адаптеры по `user_tenant_access` (новый `userService.getAccessibleTenantIds`). Проверено: site-admin видит только `test`, global — все 11.
    - [FIXED 2026-06] RBAC enforced: proxy +server.ts checks tenant per-request (403 if unauthorized), registry resets via resetRegistry() between requests, sidebar scopes per-tenant. Code verified.
- **⬜ Недостающие per-site разделы (паритет со старой `webs/admin-rewrite`) — описать/сделать:**
  - **newsletter** (`sites/[slug]/newsletter`): источник `admin-rewrite/.../newsletter`, webs proxy `newsletter/[slug]` (Novu): подписчики, CSV-экспорт, кампании, конфиг. Было E14f/B4.2. Эффорт ~L.
  - **schedules** (`sites/[slug]/schedules` + глоб. `/schedules`): расписания публикаций; webs `schedules`, `schedules/trigger`, `schedules/[id]`. Было B4.3. ~M.
  - **subscription** (`sites/[slug]/subscription`): подписка/биллинг сайта; webs `subscriptions`/`admin-proxy/subscriptions`. ~M. (Связано с платформенным billing hiai-admin — решить, site-уровень vs tenant-billing.)
  - **site-create** (`sites/create`): сейчас есть только `connect` (подключить существующий бэкенд). Старая админка создаёт сайт (name/slug/status/theme/plan → webs `POST /sites`). Нужен мастер «создать сайт» + провижн tenant+adapter. ~M.
  - **Глобальные (отложено B5):** deep-analytics 5 вкладок (E14d, `analytics/[siteId]`), generation-config (E14g), logs-viewer, media-kit, AI-дизайн/темы (themes.ts), crypto/NOWPayments (E14e). Скоуп первого релиза — без них.
- **⬜ Прод-обвязка до запуска:** (a) Docker-образ hiai-admin на `webs_webs` (вместо dev+socat) — bun-workspace build; (b) Caddy реальный домен (параллельно legacy, без даунтайма); (c) **2FA** Better Auth TOTP (намеренно отключён для теста) + энфорс для админов; (d) **webs-api rebuild** (сейчас hot-patch `docker cp` 6 файлов) + коммит правок hiai-admin+webs; (e) ротация утёкшего секрета; (f) E2E + пилот-кат → вывод `admin-rewrite`.
- **Тест-аккаунты (стенд http://localhost:50250):** глобал-админ `admin@hiai.local` / `AdminTest!2026` (super_admin, все сайты); сайт-админ `siteadmin@hiai.local` / `SiteTest!2026` (admin, только сайт `test`). Песочница = сайт `test` (демо-статья + hero-блок).
- **Cleanup:** app lint (1 err/74 warn), svelte-check (5 err/48 warn), `@hiai/ui` 8 dead-import refs, layerchart `.d.ts` shim, 17 `as any` касты
- **Enhancements E1-E10:** nonce-CSP, cursor-pagination, Redis-кэш permissions/settings, централизованный error-enum, OpenAPI, body-size-limits, proxy allowlist, shared `AdminContext`-тип, CSRF
| **Total remaining** | | **~67.5h** | |
