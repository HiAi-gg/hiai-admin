# Migration Fix Summary

## Problem
The Drizzle migrations had type mismatches that prevented clean database provisioning:

1. **Migration 0000**: `user_roles.tenant_id` was created as `text` type, but `tenants.id` is `uuid` type
2. **Migration 0002**: Attempted to fix the type mismatch with `ALTER TABLE "user_roles" ALTER COLUMN "tenant_id" SET DATA TYPE uuid;` but this failed because the foreign key constraint from migration 0000 prevented the column type change

## Root Cause
The schema source-of-truth in `src/db/schema/role.ts` correctly defines:
```typescript
tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }),
```

But the initial migration SQL in `drizzle/0000_clean_nomad.sql` incorrectly created the column as `text`.

## Solution Applied

### File 1: `drizzle/0000_clean_nomad.sql`
**Changed line 73 from:**
```sql
"tenant_id" text,
```
**To:**
```sql
"tenant_id" uuid,
```

This ensures the column type matches the schema definition and `tenants.id` type from the start.

### File 2: `drizzle/0002_brief_mastermind.sql`
**Removed line 16:**
```sql
ALTER TABLE "user_roles" ALTER COLUMN "tenant_id" SET DATA TYPE uuid;-->
```

Since `tenant_id` is now correctly created as `uuid` in migration 0000, this ALTER statement is no longer needed and would cause an error.

## Verification
All `tenant_id` columns are now consistently `uuid` type across:
- `invoices.tenant_id` (line 14 in 0000) ✓
- `subscriptions.tenant_id` (line 59 in 0000) ✓
- `user_roles.tenant_id` (line 73 in 0000) ✓ FIXED
- `user_tenant_access.tenant_id` (line 109 in 0000) ✓
- `webhooks.tenant_id` (line 132 in 0000) ✓
- `site_adapters.tenant_id` (line 3 in 0002) ✓

All foreign key constraints properly reference `tenants.id` which is `uuid`.

## Result
Running `bun run db:migrate` on a fresh database should now succeed with no type mismatch errors.
