# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.0.5] - 2026-07-09

### Added

- **@hiai/ui 0.1.1 integration**: App frontend now depends on published `@hiai-gg/hiai-ui@0.1.1` via `@hiai/ui` alias, replacing the local `file:` override.
- **Select unification**: All 15 native `<select>` elements across the app migrated to hiai-ui `SelectRoot`/`SelectTrigger`/`SelectContent`/`SelectItem` primitives (users, tenants, settings, security, RBAC, sites, articles pages).
- **NotificationBell Popover**: Replaced bespoke click/outside/Escape popover logic with hiai-ui `Popover` primitive.
- **EditorToolbar DropdownMenu/Popover**: 6 bespoke toolbar panels migrated to hiai-ui `DropdownMenu` (3) and `Popover` (3) primitives, removing ~170 lines of manual DOM event handling.

### Changed

- Root/backend package versions bumped to 0.0.5.

## [0.0.4] - 2026-07-07

### Changed

- **Clean release retry** after partially failed v0.0.3 tag (CI tag run failed; Docker push, npm publish, and GitHub Release did not complete).
- Includes all SeaweedFS/Object Storage migration content from v0.0.3.
- Fixed backend Dockerfile for CI context (`f561340`).
- Fixed Biome formatting across the codebase.

## [0.0.3] - 2026-07-07

### Changed

- **BREAKING**: Replaced MinIO with SeaweedFS S3-compatible object storage.
  - New env vars: `OBJECT_STORAGE_*` (replaces `MINIO_*`).
  - New npm dependency: `@aws-sdk/client-s3` (removed `minio`).
  - `backend/src/lib/minio.ts` → `backend/src/lib/object-storage.ts`.
  - Exports renamed: `MinioError` → `ObjectStorageError`, `isMinioConfigured` → `isObjectStorageConfigured`.
  - Internal API changed to AWS SDK v3 commands (`S3Client`, `HeadBucketCommand`, `CreateBucketCommand`, `PutObjectCommand`).
  - Infra: `shared-minio` replaced by `shared-seaweedfs` in docker compose.
  - See updated `.env.example` for new variables.
- Root/backend package versions bumped to 0.0.3.

## [0.0.2] - 2026-07-07

### Changed

- Session/TTL/DB connection now fully env-configurable (SESSION_EXPIRES_IN_SEC, SESSION_UPDATE_AGE_SEC, SESSION_COOKIE_CACHE_MAX_AGE_SEC, BACKEND_TOKEN_EXPIRES_IN_SEC, split DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME).
- Redis connection now retries forever (REDIS_MAX_RETRIES/REDIS_RETRY_MAX_DELAY_MS) so the API can start before Redis is healthy.
- Stripe is optional at startup; billing endpoints return 503 when STRIPE_SECRET_KEY is unset.
- Site adapter schema extended with apiBase/siteId/publicSlug/adapterSlug/pathMap and a pathMap-driven proxy; backend SSO tokens mapped to webs-compatible roles (viewer/editor/admin/super_admin).
- Idempotent seed (ON CONFLICT DO NOTHING / DO UPDATE) safe to re-run.
- `drizzle-kit push` gated behind DB_AUTO_PUSH=true (db:push now aliases the gated auto-push).
- Frontend build no longer needs fake backend env placeholders (lazy config).

## [0.0.1] - 2026-06-10

### Added

- Elysia API backend with TypeScript-first routing and validation
- Drizzle ORM schemas for type-safe database access
- Better Auth integration for authentication flows
- Role-Based Access Control (RBAC) with fine-grained permissions
- Comprehensive audit logging for security-relevant events
- Docker configuration for development and production deployments
- SvelteKit frontend with server-side rendering
- Stripe integration for subscription billing and payments
- Ko-fi integration for alternative supporter payments
- Umami analytics integration for privacy-friendly usage tracking
- Billing management dashboard for subscription oversight
- Tenant management system for multi-tenant operations
- User management interface with role assignments
- Settings management for system configuration

### Changed

- Initial release

### Fixed

- Initial release

### Security

- Initial release

[Unreleased]: https://github.com/HiAi-gg/hiai-admin/compare/v0.0.5...HEAD
[0.0.5]: https://github.com/HiAi-gg/hiai-admin/releases/tag/v0.0.5
[0.0.4]: https://github.com/HiAi-gg/hiai-admin/releases/tag/v0.0.4
[0.0.3]: https://github.com/HiAi-gg/hiai-admin/releases/tag/v0.0.3
[0.0.2]: https://github.com/HiAi-gg/hiai-admin/releases/tag/v0.0.2
[0.0.1]: https://github.com/HiAi-gg/hiai-admin/releases/tag/v0.0.1
