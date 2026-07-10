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
ALTER TABLE "site_adapters" ADD CONSTRAINT "site_adapters_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "site_adapters_tenant_idx" ON "site_adapters" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "site_adapters_enabled_idx" ON "site_adapters" USING btree ("enabled");