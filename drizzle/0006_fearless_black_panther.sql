ALTER TABLE "comments" ADD COLUMN "ai_model" text;--> statement-breakpoint
ALTER TABLE "comments" ADD COLUMN "prompt_version" text;--> statement-breakpoint
ALTER TABLE "comments" ADD COLUMN "is_human_reviewed" boolean DEFAULT false NOT NULL;