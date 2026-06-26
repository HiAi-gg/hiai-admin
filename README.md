# hiai-admin

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE)
[![Bun](https://img.shields.io/badge/Bun-1.3.14%2B-000?logo=bun)](https://bun.sh)
[![Status](https://img.shields.io/badge/status-active-brightgreen)]()

Central admin panel for the HiAi SaaS platform — tenant management, user administration, billing, analytics, and platform settings.

**This is the main control center of the entire HiAi ecosystem.**

## Quick Start

```bash
cd projects/hiai-admin
cp .env.example .env        # fill in DATABASE_URL, REDIS_URL, BETTER_AUTH_SECRET, STRIPE_SECRET_KEY
bun install                  # install dependencies
bun run db:generate          # generate Drizzle migrations
bun run db:push              # apply migrations to database
bun run dev                  # start API (port 50200) + Frontend (port 50201)
```

**Health check:**
```bash
curl -fsS http://localhost:50200/api/health
```

## Docker Quick Start

```bash
docker compose up -d --build
```

- **API:** http://localhost:50200 (health: `/api/health`)
- **Frontend:** http://localhost:50201
- **PostgreSQL:** port 5435
- **Redis:** port 6382

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| **Runtime** | Bun | 1.3.14+ |
| **Backend** | Elysia | 1.4.28+ |
| **ORM** | Drizzle ORM | 0.45.2+ |
| **Validation** | Zod | latest |
| **Database** | PostgreSQL + pgvector | 18.4 |
| **Cache/Queue** | Redis | 8.6+ |
| **Frontend** | Svelte 5 + SvelteKit | 2.60+ |
| **UI Components** | @hiai-gg/hiai-ui (shadcn-svelte + Tailwind CSS v4) | ^0.0.4 |
| **Data Tables** | TanStack Table | latest |
| **Data Fetching** | TanStack Query | latest |
| **Auth** | Better Auth | latest |
| **Payments** | Stripe | 14.10+ |
| **Charts** | LayerChart | latest |
| **Observability** | @hiai-gg/hiai-observe | ^0.1.9 |

## Architecture

```
hiai-admin-api (Elysia)     hiai-admin-frontend (SvelteKit)
  port 50200                   port 50201
       │                            │
       ├── /api/tenants             ├── /dashboard
       ├── /api/users               ├── /tenants
       ├── /api/billing             ├── /users
       ├── /api/analytics           ├── /billing
       ├── /api/settings            ├── /analytics
       ├── /api/audit               ├── /settings
       └── /api/integrations        └── /security
              │
              ├── PostgreSQL 18.4 (tenants, users, roles, billing, audit)
              ├── Redis 8.6+ (sessions, rate limiting, caching)
              ├── Stripe (subscriptions, Connect, invoicing)
              └── @hiai-gg/hiai-observe (errors, uptime, traces)  ← npm package
```

The module consists of two parts:
1. **Backend** — Elysia API service (`hiai-admin-api`)
2. **Frontend** — SvelteKit application (`hiai-admin-frontend`)

Both can run as a single monolith or as separate services.

## Key Features

- **Multi-tenant management** — provision, suspend, configure, and monitor all stores
- **User & role management** — RBAC with Super Admin, Tenant Admin, and Staff roles
- **Billing & subscriptions** — Stripe-powered plans, invoices, and platform fee collection
- **Global analytics** — MRR, churn, LTV, CAC, active tenants, growth metrics
- **Platform settings** — global configuration, feature flags, integrations
- **Security & audit** — 2FA, session management, complete audit trail of all actions
- **Integration management** — Stripe, Shippo, @hiai-gg/hiai-observe, and third-party service configuration

## Project Structure

```
/hiai-admin
  /src
    /api              # Elysia routes (tenants, users, billing, analytics, settings, audit)
    /lib              # Business logic (tenant provisioning, billing, analytics)
    /db               # Drizzle schemas + migrations
    /auth             # Better Auth configuration + RBAC
    /modules          # Feature modules (tenants, users, billing, analytics, audit, settings)
  /app                # SvelteKit frontend
    /routes
      /dashboard      # Platform overview + key metrics
      /tenants        # Tenant list, detail, provisioning
      /users          # User management, roles, permissions
      /billing        # Subscriptions, invoices, payments
      /analytics      # Charts, metrics, reports
      /settings       # Platform configuration
      /security       # Audit logs, 2FA, session management
      /integrations   # Third-party service management
  /docker-compose.yml
  /Dockerfile
```

## Database

Core tables managed by Drizzle ORM:

| Table | Purpose |
|---|---|
| `tenants` | Store/merchant accounts with config and status |
| `users` | Platform users (owners + staff) |
| `user_tenant_access` | User-tenant permission mapping |
| `roles` | RBAC role definitions |
| `permissions` | Granular permission entries |
| `role_permissions` | Role-permission mapping |
| `subscriptions` | Stripe subscription records |
| `invoices` | Billing invoice history |
| `settings` | Global platform configuration (key-value) |
| `audit_logs` | Complete action trail (actor, action, resource, metadata, IP) |
| `integrations` | Third-party service credentials (encrypted) |
| `webhooks` | Registered webhook endpoints |

## API Endpoints (overview)

| Group | Routes | Auth |
|---|---|---|
| Health | `GET /api/health` | Public |
| Tenants | `GET/POST/PUT/DELETE /api/tenants` | Super Admin |
| Users | `GET/POST/PUT /api/users` | Super Admin |
| Billing | `GET/POST /api/billing/*` | Super Admin |
| Analytics | `GET /api/analytics/*` | Super Admin |
| Settings | `GET/PUT /api/settings` | Super Admin |
| Audit | `GET /api/audit` | Super Admin |
| Integrations | `GET/POST/PUT /api/integrations` | Super Admin |
| Webhooks | `POST /api/webhooks/stripe` | Stripe signature |

## Environment Variables

```bash
# Database (local development — change for production)
DATABASE_URL=postgresql://hiadmin:password@localhost:5435/hiai_admin

# Redis
REDIS_URL=redis://localhost:6382

# Auth
BETTER_AUTH_SECRET=change-me-min-32-characters-long
BETTER_AUTH_URL=http://localhost:50200

# Stripe (use sk_test_ for development)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PLATFORM_ACCOUNT_ID=acct_...

# @hiai-gg/hiai-observe (npm: ^0.1.9) — observability SDK
HIAI_OBSERVE_URL=http://localhost:8001

# Ports
API_PORT=50200
FRONTEND_PORT=50201
```

## Related Projects

| Project | Relationship |
|---|---|
| [hiai-store](https://github.com/hiailabs/hiai-store) | E-commerce stores managed by this admin panel |
| [hiai-post](https://github.com/hiailabs/hiai-post) | Social media publishing managed by this admin panel |

## License

MIT — see [LICENSE](./LICENSE) for details.
