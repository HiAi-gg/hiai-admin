# hiai-admin — Agent Operating Instructions

## 📍 Источник правды экосистемы (читать первым)

Этот проект — часть экосистемы HiAi. **Общая правда живёт в корне `projects/`:**

- [`../HIAI_CONVENTIONS.md`](../HIAI_CONVENTIONS.md) — правила, топология, дизайн-токены, plugin-контракт.
- [`../../packages/hiai-ui/README.md`](../../packages/hiai-ui/README.md) — **@hiai/ui**: контракт потребления (токены/примитивы/композиты); план — [`../HIAI_UI_PACKAGE_PLAN.md`](../HIAI_UI_PACKAGE_PLAN.md).
- [`../HIAI_ECOSYSTEM_UNIFICATION_PLAN.md`](../HIAI_ECOSYSTEM_UNIFICATION_PLAN.md) — программа унификации (U0–U5).
- [`../HIAI_ADMIN_INTEGRATION_PLAN.md`](../HIAI_ADMIN_INTEGRATION_PLAN.md) — **главный план проекта** (Блок A доработка + Блок B интеграция в webs).
- [`../HIAI_ADMIN_DIFFS.md`](../HIAI_ADMIN_DIFFS.md) — дифы критпути (волны W1–W8).
- [`../HIAI_PROJECTS_ROADMAP.md`](../HIAI_PROJECTS_ROADMAP.md) — место проекта в экосистеме.

**Роль:** универсальный продукт-админка (host). Подключает модули (store/post/docs/observe);
арендуется сайтами (первый — `webs`). Остаётся независимым upstream — webs получает копию-инстанс.
**Что дальше:** волны в `HIAI_ADMIN_DIFFS.md` (W1 тесты → W2 SiteAdapter → …).

### Документы проекта (индекс)
| Документ | Назначение | Статус |
|---|---|---|
| `README.md` · `AGENTS.md` (этот) · `todo.md` | обзор · правила · живой статус | core |
| `SECURITY.md`, `CHANGELOG.md`, `CONTRIBUTING.md` | стандартные | core |

> 7 аудит/план/ревью-доков (`DEVELOPMENT-GUIDE`, `TASK-PLAN`, `CRITIC-REVIEW`, `PRODUCTION-READINESS`,
> `QUALITY-ASSESSMENT`, `SECURITY-AUDIT`, `SECURITY-AUDIT-WAVE3`) поглощены 2026-06-16 в раздел
> «📚 Поглощённые документы» внизу `todo.md` и удалены; полный текст — в истории git.

> ⚠️ Статусная сверка: B1/B2/E13 из `todo.md` **уже сделаны в коде** (см. `HIAI_ADMIN_DIFFS.md` §0).

## Identity & Purpose

`hiai-admin` is the central admin panel for the HiAi SaaS platform. It is the **main control center** of the entire HiAi ecosystem, managing all tenants (stores), users, billing, settings, global analytics, and security.

This module provides platform-level administration — it is NOT a store admin (that lives in `hiai-store`). Think of it as the "platform owner's dashboard" for managing the entire multi-tenant e-commerce ecosystem.

**What agents should know before working here:**
- It uses Drizzle ORM (not raw pg like webs) — this is a deliberate upgrade choice.
- Better Auth replaces the custom JWT system from webs — use the Better Auth adapter pattern.
- RBAC hierarchy: `super_admin` (platform owner) > `tenant_admin` (merchant) > `staff` (merchant's employees).
- All CUD operations must be logged to `audit_logs` — no exceptions.
- Stripe Connect is used for platform billing (platform takes a cut of merchant transactions).

## Runtime Contract

- **Stack:** Bun 1.3.14+, Elysia 1.4.28+, Drizzle ORM 0.45.2+, PostgreSQL 18.4 + pgvector, Redis 8.6+, Svelte 5 + SvelteKit 2.60+, shadcn-svelte, TanStack Query + Table, Better Auth, Stripe 14.10+, LayerChart
- **Ports:** API `50200`, Frontend `50201`
- **Database:** `hiai_admin` on PostgreSQL (port 5435 via docker-compose)
- **Redis:** Instance (port 6382 via docker-compose), key prefix `hiadmin:`
- **Health:** `GET http://localhost:50200/api/health`

## Canonical Commands

```bash
# Install
cd projects/hiai-admin
bun install

# Environment
cp .env.example .env   # fill DATABASE_URL, REDIS_URL, BETTER_AUTH_SECRET, STRIPE_SECRET_KEY

# Database
bun run db:generate    # generate Drizzle migrations
bun run db:push        # push schema to database
bun run db:migrate     # run pending migrations
bun run db:seed        # seed initial data (super admin user, default roles)

# Development
bun run dev            # start API + Frontend concurrently
bun run dev:api        # start API only (port 50200)
bun run dev:frontend   # start Frontend only (port 50201)

# Build
bun run build          # build both API and Frontend
bun run build:api      # build API only
bun run build:frontend # build Frontend only

# Quality
bun run lint           # ESLint
bun run typecheck      # tsc --noEmit
bun run test           # vitest
bun run test:e2e       # E2E tests (agent-browser — Playwright is FORBIDDEN)

# Docker
docker compose up -d --build
docker compose logs -f hiai-admin-api
```

## Repo Map

| Path | Role |
|---|---|
| `src/api/` | Elysia API — route modules, middleware, error handling |
| `src/api/routes/` | Route files: `tenants.ts`, `users.ts`, `billing.ts`, `analytics.ts`, `settings.ts`, `audit.ts`, `integrations.ts` |
| `src/api/middleware/` | Auth guard, RBAC check, rate limiter, audit logger, request validation |
| `src/lib/` | Business logic — tenant provisioning, billing engine, analytics aggregation |
| `src/db/` | Drizzle schemas, migrations, seed scripts |
| `src/db/schema/` | Drizzle table definitions (separate files per entity: tenant.ts, user.ts, role.ts, etc.) |
| `src/auth/` | Better Auth configuration, RBAC helpers, 2FA setup |
| `src/modules/` | Feature modules: `tenants/`, `users/`, `billing/`, `analytics/`, `audit/`, `settings/`, `integrations/` |
| `app/` | SvelteKit frontend application |
| `app/src/routes/` | SvelteKit routes: `dashboard/`, `tenants/`, `users/`, `billing/`, `analytics/`, `settings/`, `security/`, `integrations/` |
| `app/src/lib/` | Shared frontend utilities: API client, stores, components |
| `app/src/lib/components/` | Reusable UI components (shadcn-svelte based) |
| `docker-compose.yml` | Service definition for hiai-admin |
| `.env.example` | Environment variable template |

## Start Here As An Agent

1. **Read `README.md`** for project overview and architecture
2. **Read `todo.md`** for current task backlog
3. **Read `src/db/schema.ts`** to understand data models (create this first)
4. **Read `src/auth/`** to understand RBAC configuration
5. **API tasks:** work in `src/api/routes/` and `src/modules/`
6. **Frontend tasks:** work in `app/src/routes/` and `app/src/lib/components/`
7. **Schema changes:** modify `src/db/schema.ts`, then run `bun run db:generate`

## Key Patterns

### RBAC Middleware
Every route must use `requireRole('super_admin')` or `requirePermission('resource:action')` middleware. No public admin endpoints except health check and Stripe webhooks.

### Audit Logging
All create, update, and delete operations must call `auditLog({ actorId, action, resource, resourceId, metadata, ip })`. This is non-negotiable — security compliance requires a complete action trail.

### Tenant Provisioning
When creating a new tenant:
1. Insert tenant record
2. Create Stripe customer via Stripe API
3. Set up default roles and permissions
4. Send welcome email via Novu
5. Log to audit trail

### Multi-Tenant Data Isolation
All queries must scope by `tenant_id`. Use Drizzle's `where(eq(schema.tenants.id, tenantId))` pattern. Never query across tenants unless explicitly requested by super_admin.

### Error Handling
Use Elysia's `set.status` + `return { error }` pattern. Do NOT use `error()` in handlers (Elysia 1.4+ pattern from codebase).

### Frontend Data Fetching
Use TanStack Query for all API calls. Cache keys follow `[module, action, params]` pattern. Invalidate on mutations.

## Integration Points

| Service | Protocol | Purpose |
|---|---|---|
| `hiai-store` | REST API | Store management, product sync, order data |
| `hiai-post` | REST API | Social account management, post scheduling |
| **Observability** | Sentry DSN | Error tracking, uptime monitoring, traces |
| Stripe | SDK + Webhooks | Billing, subscriptions, Connect payouts |
| Novu | SDK | Email notifications (welcome, billing, alerts) |
| HiAi Observe | Sentry DSN | Error forwarding from admin panel |

## Shared Infrastructure

The following are available from the shared Docker stack:
- **PostgreSQL 18.4** — shared instance, create `hiai_admin` database
- **Redis 8.6+** — instance (port 6382), use key prefix `hiadmin:`
- **MinIO** — shared instance, use bucket `hiai-admin`
- **Novu** — shared notification service
- **Caddy** — shared reverse proxy for domain routing

Reference patterns for auth and payments are implemented in `backend/src/auth/` and `backend/src/modules/billing/`.
- `backend/src/api/middleware/rateLimiter.ts` — Redis-backed rate limiter
- `backend/src/api/middleware/auth.ts` — RBAC middleware pattern
