CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"body" text,
	"data" jsonb DEFAULT '{}'::jsonb,
	"novu_message_id" text,
	"read" boolean DEFAULT false NOT NULL,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "site_adapters" ADD COLUMN "api_base" text DEFAULT '/api/v1' NOT NULL;--> statement-breakpoint
ALTER TABLE "site_adapters" ADD COLUMN "site_id" text;--> statement-breakpoint
ALTER TABLE "site_adapters" ADD COLUMN "public_slug" text;--> statement-breakpoint
ALTER TABLE "site_adapters" ADD COLUMN "adapter_slug" text;--> statement-breakpoint
ALTER TABLE "site_adapters" ADD COLUMN "path_map" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
CREATE INDEX "notifications_user_idx" ON "notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "notifications_user_unread_idx" ON "notifications" USING btree ("user_id","read");--> statement-breakpoint
CREATE INDEX "notifications_created_idx" ON "notifications" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "site_adapters_public_slug_idx" ON "site_adapters" USING btree ("public_slug");--> statement-breakpoint
CREATE UNIQUE INDEX "site_adapters_public_slug_unique" ON "site_adapters" USING btree ("public_slug");