CREATE TABLE IF NOT EXISTS "site_invites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"site_adapter_id" uuid NOT NULL,
	"email" text NOT NULL,
	"token_hash" text NOT NULL,
	"role" text DEFAULT 'viewer' NOT NULL,
	"permissions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"accepted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "site_invites_token_hash_unique" UNIQUE("token_hash"),
	CONSTRAINT "site_invites_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE cascade,
	CONSTRAINT "site_invites_site_adapter_id_site_adapters_id_fk" FOREIGN KEY ("site_adapter_id") REFERENCES "site_adapters"("id") ON DELETE cascade
);
