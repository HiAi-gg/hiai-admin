CREATE TABLE "site_memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"site_adapter_id" uuid NOT NULL,
	"global_role" text DEFAULT 'viewer' NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"permissions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "site_adapters" ADD COLUMN "adapter_manifest_version" text DEFAULT '1.0.0' NOT NULL;--> statement-breakpoint
ALTER TABLE "site_adapters" ADD COLUMN "connector_type" text DEFAULT 'http' NOT NULL;--> statement-breakpoint
ALTER TABLE "site_adapters" ADD COLUMN "connector_config" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "site_adapters" ADD COLUMN "capabilities" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "site_adapters" ADD COLUMN "external_site_reference" text;--> statement-breakpoint
ALTER TABLE "site_adapters" ADD COLUMN "secret_refs" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "site_memberships" ADD CONSTRAINT "site_memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_memberships" ADD CONSTRAINT "site_memberships_site_adapter_id_site_adapters_id_fk" FOREIGN KEY ("site_adapter_id") REFERENCES "public"."site_adapters"("id") ON DELETE cascade ON UPDATE no action;