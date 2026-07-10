Task 4 Report — hiai-admin secure invite-only membership

Scope
- Repo: `hiai-admin`
- Files changed:
  - `backend/src/api/validation/user.schema.ts`
  - `backend/src/api/routes/profile.ts`
  - `backend/src/modules/user/user.service.ts`
  - `backend/src/db/schema/site-invite.ts`
  - `backend/src/db/schema/index.ts`
  - `backend/src/modules/site-membership/site-invite.service.ts`
  - `backend/src/api/routes/site-invites.ts`
  - `backend/src/api/index.ts`
  - `backend/tests/integration/site-invites.test.ts`
  - `app/src/routes/(admin)/profile/tenants/+page.svelte`

Implementation
- Added exploit regression tests in `backend/tests/integration/site-invites.test.ts`:
  - `cannot join a tenant by knowing only its slug`
  - `cannot request super_admin or tenant_admin in invite acceptance`
  - `accepts an unexpired single-use invite for the exact session email`
  - `rejects replay, expired token and mismatched email`
- Disabled slug-only join path in `POST /api/profile/tenants/join`:
  - `backend/src/api/routes/profile.ts` now returns HTTP `410` with
    `{ error: 'INVITE_REQUIRED', code: 'INVITE_REQUIRED' }`.
- Removed caller-selected join role in user service join flow:
  - `userService.joinTenant()` now forces `super_admin`/`tenant_admin` to `viewer`.
- Added hashed invite data model:
  - New `site_invites` table in `backend/src/db/schema/site-invite.ts` with `token_hash` persisted.
  - Exported from `backend/src/db/schema/index.ts` and related relation wiring added.
- Added invite acceptance service:
  - `backend/src/modules/site-membership/site-invite.service.ts` validates token hash, expiry, single-use (`accepted_at`), and email/session match.
  - Resolves role server-side (`viewer`/`editor` only), writes `user_tenant_access` and `site_memberships` transactionally, stamps `accepted_at`, and audits action without storing/transmitting raw tokens.
- Added API route:
  - New `POST /api/site-invites/:token/accept` in `backend/src/api/routes/site-invites.ts` using `siteInviteService.acceptInvite`.
  - Route mounted in `backend/src/api/index.ts`.
- Updated profile tenants UI:
  - `app/src/routes/(admin)/profile/tenants/+page.svelte` no longer exposes slug join form or role selector; keeps read-only memberships + leave action only.

Tests
- `bunx vitest run backend/tests/integration/site-invites.test.ts`
  - failed in this sandbox due tempdir write restriction (`ReadOnlyFileSystem`).
- `cd /mnt/ai_data/projects/hiai-admin/backend && bun run vitest run tests/integration/site-invites.test.ts`
  - passed: `1 passed (1)` file, `4 passed (4)` tests.
- `cd /mnt/ai_data/projects/hiai-admin && bun run typecheck`
  - passed with non-blocking pre-existing Svelte warnings; no errors.

Concerns
- `bunx` could not be used in this environment due filesystem restrictions, so the exact command in the task brief could not be executed directly.
- Existing warnings in `bun run typecheck` are unrelated to this task and were not introduced by these edits.
