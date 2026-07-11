CREATE TABLE IF NOT EXISTS "integration_operations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"operation_id" text NOT NULL,
	"payload_hash" text NOT NULL,
	"token_jti" text NOT NULL,
	"status" text DEFAULT 'processing' NOT NULL,
	"response" jsonb,
	"tenant_id" uuid,
	"site_adapter_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "integration_operations_operation_id_unique" UNIQUE("operation_id"),
	CONSTRAINT "integration_operations_token_jti_unique" UNIQUE("token_jti")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "integration_operations_status_idx" ON "integration_operations" USING btree ("status");
