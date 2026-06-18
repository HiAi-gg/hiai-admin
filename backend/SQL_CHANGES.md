# SQL Migration Changes - Detailed

## Summary
Fixed type mismatches in Drizzle migrations that prevented clean database provisioning.

## Change 1: drizzle/0000_clean_nomad.sql (Line 73)

### Before (BROKEN)
```sql
CREATE TABLE "user_roles" (
	"user_id" text NOT NULL,
	"role_id" text NOT NULL,
	"tenant_id" text,
	"granted_by" text,
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL
);
```

### After (FIXED)
```sql
CREATE TABLE "user_roles" (
	"user_id" text NOT NULL,
	"role_id" text NOT NULL,
	"tenant_id" uuid,
	"granted_by" text,
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL
);
```

### Why
The foreign key constraint on line 144 references `tenants.id` which is UUID:
```sql
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_tenant_id_tenants_id_fk" 
FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id")
```

PostgreSQL cannot create a FK between `text` and `uuid` columns. The column must be UUID.

---

## Change 2: drizzle/0002_brief_mastermind.sql (Line 16)

### Before (PROBLEMATIC)
```sql
CREATE TABLE "site_adapters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"backend_url" text NOT NULL,
	"auth" text DEFAULT 'jwt' NOT NULL,
	"jwt_secret_encrypted" text,
	"modules" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "site_adapters_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "user_roles" ALTER COLUMN "tenant_id" SET DATA TYPE uuid;
--> statement-breakpoint
ALTER TABLE "site_adapters" ADD CONSTRAINT "site_adapters_tenant_id_tenants_id_fk" 
FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
```

### After (FIXED)
```sql
CREATE TABLE "site_adapters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"backend_url" text NOT NULL,
	"auth" text DEFAULT 'jwt' NOT NULL,
	"jwt_secret_encrypted" text,
	"modules" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "site_adapters_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "site_adapters" ADD CONSTRAINT "site_adapters_tenant_id_tenants_id_fk" 
FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
```

### Why
The `ALTER TABLE "user_roles" ALTER COLUMN "tenant_id" SET DATA TYPE uuid;` line was attempting to fix the type mismatch after-the-fact. However:

1. When migration 0000 runs, it creates the FK constraint on `user_roles.tenant_id`
2. In PostgreSQL, you cannot change a column's type if it has an FK constraint
3. This operation would fail with: "cannot alter type of a column used in a foreign key constraint"

By fixing the type in migration 0000 (Change 1), this ALTER statement is no longer needed and has been removed.

---

## Result

All migrations now execute successfully in order:
1. **0000_clean_nomad.sql** - Creates tables with correct UUID types
2. **0001_worried_husk.sql** - Creates auth tables
3. **0002_brief_mastermind.sql** - Creates site_adapters table

No type mismatches, no constraint violations, clean database provisioning.
