Task 1 Report — Headless hiai-admin Account Bootstrap/Auth-Event Contract

Scope
- Repo: `hiai-admin`
- Completed files:
  - `backend/src/auth/index.ts`
  - `backend/src/modules/user/user.service.ts`
  - `backend/src/lib/config.ts`
  - `backend/src/modules/auth-events/auth-event.types.ts`
  - `backend/src/modules/auth-events/auth-event.service.ts`
  - `backend/tests/integration/account-bootstrap.test.ts`
  - `backend/tests/unit/auth-event.service.test.ts`
  - `.env.example`
  - `README.md`

Implementation
- Added `AuthActionEvent` types for:
  - `auth.email_verification_requested`
  - `auth.password_reset_requested`
- Added `auth-event.service.ts`:
  - builds event payload with lowercase recipient email and `expiresAt` 60 seconds ahead
  - signs HS256 JWT claim set:
    `iss`, `aud`, `sub: 'auth-event'`, `eventId`, `eventType`, `iat`, `exp = iat + 60`
  - posts to `AUTH_EVENT_WEBHOOK_URL` with:
    - `Idempotency-Key: event.id`
    - `Authorization: Bearer <jwt>`
  - retry plan: 250ms, 1s, 3s; terminal on 4xx, retriable on 5xx/network/timeouts
  - startup guard for placeholder webhook secrets via `isPlaceholderSecret`
  - logs only non-sensitive fields (`eventId`, `eventType`, `status`)
- Added `userService.ensurePlatformProfile({ email, name })`:
  - lowercases email
  - upserts platform user by email (`onConflictDoNothing`)
  - defaults role `viewer`
  - does not create tenant/site access
- Added Better Auth hooks/callback wiring:
  - `databaseHooks.user.create.after` calls `ensurePlatformProfile`
  - `sendVerificationEmail` and `sendResetPassword` dispatch signed auth events
  - `AUTH_SIGNUP_MODE`/trusted-client gate + constant-time `X-Auth-Trusted-Client` check for signup/password-reset routes
  - configured session cookie domain and hardening (`SameSite=Lax`, `Secure`, `HttpOnly`)
- Added env variables in schema and examples:
  - `AUTH_SIGNUP_MODE`, `AUTH_TRUSTED_CLIENT_SECRET`, `AUTH_COOKIE_DOMAIN`,
    `AUTH_EVENT_WEBHOOK_URL`, `AUTH_EVENT_WEBHOOK_SECRET`,
    `AUTH_EVENT_WEBHOOK_AUDIENCE`, `AUTH_EVENT_WEBHOOK_ISSUER`

Tests
- Focused tests executed:
  - `cd backend && bunx vitest run tests/integration/account-bootstrap.test.ts tests/unit/auth-event.service.test.ts`
  - Result: PASS (`2 passed`, `9 tests`).
- Product-neutral regex check executed:
  - `rg -n -i 'webs|webs.cool|MAIL_API_URL|MAIL_API_KEY' backend/src/modules/auth-events backend/src/auth/index.ts`
  - Result: no matches.
- Full suite checks:
  - `bun run test` failed (pre-existing environment/type issues, see below).
  - `bun run typecheck` failed (pre-existing TS errors in site-invite modules).

Concerns / residuals
- `bun run test` failure:
  - `tests/integration/site-invites.test.ts` throws `logger.child is not a function`
  - shared backends unreachable in current environment, causing `auth-shared` flow skip/failure
- `bun run typecheck` failure:
  - `src/api/routes/site-invites.ts` and `src/modules/site-membership/site-invite.service.ts`
  - not introduced by Task 1 files.

Fixes applied for Important findings
- Added actual auth-route enforcement for `AUTH_SIGNUP_MODE` in `backend/src/api/index.ts`
  using `getAuthSignupPolicyError` before Better Auth routes are mounted:
  - `disabled` now blocks `/sign-up/email` and password-reset request routes
  - `trusted-client` now requires constant-time `X-Auth-Trusted-Client` header on signup + password-reset request routes
  - `public` permits standard behavior
- Added route-aware fallback checks in `backend/src/auth/index.ts`:
  - matches `POST /api/auth/sign-up/email`, `POST /api/auth/forget-password`, and `POST /api/auth/request-password-reset`
- Added per-attempt webhook request timeout in `backend/src/modules/auth-events/auth-event.service.ts`:
  - each attempt uses `AbortController` with `10_000`ms timeout (`DEFAULT_WEBHOOK_TIMEOUT_MS`)
  - timeout maps to retriable errors and preserves retry budget
- Added focused regression tests:
  - `backend/tests/unit/auth-signup-policy.test.ts`
  - timeout coverage in `backend/tests/unit/auth-event.service.test.ts`

Validation after fixes
- `cd backend && bunx vitest run tests/integration/account-bootstrap.test.ts tests/unit/auth-event.service.test.ts`
  - PASS (`2 passed`, `10 tests`).
- `cd backend && bunx vitest run tests/unit/auth-signup-policy.test.ts tests/unit/auth-event.service.test.ts`
  - PASS (`2 passed`, `12 tests`).
- `cd backend && bun run typecheck`
  - PASS (`tsc --noEmit`).

Residuals after fix
- Existing full-suite and environment issues remain unchanged:
  - `bun run test` (pre-existing failures listed above)
