## Task 3 Report: Atomic Generic Site Access

Implemented the generic service-JWT site-access provisioning and compensation API.

Files include:
- `backend/src/api/routes/integration-site-access.ts`
- `backend/src/modules/integrations/site-access-provisioning.service.ts`
- `backend/src/api/validation/integration-site-access.schema.ts`
- `backend/src/db/schema/integration-operation.ts`
- `backend/tests/integration/integration-site-access.test.ts`

The provisioning service uses one transaction with an operation advisory lock, fixed `free` plan, owner profile/email validation, owner tenant/site permissions, disabled-then-enabled adapter activation, durable operation response, and compensation that disables the adapter and suspends the tenant. The service JWT requires configured issuer/audience/secret, `site-access:provision`, a matching operation id, and a maximum 60-second lifetime.

Verification:
- `cd backend && bun run vitest run tests/integration/integration-site-access.test.ts` -> 3 passed.
- `bun run typecheck` -> TypeScript passed; existing Svelte warnings only.

Environment note: the focused tests cover contract/hash/service surface without a live PostgreSQL integration fixture in this workspace; live transaction behavior must be covered in the deployment canary against the actual shared PostgreSQL container.
