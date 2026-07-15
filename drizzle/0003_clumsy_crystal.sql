ALTER TABLE "channels" ADD COLUMN "analysis_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "channels" ADD COLUMN "analysis_window_started_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "comments" ADD COLUMN "is_malicious" boolean;