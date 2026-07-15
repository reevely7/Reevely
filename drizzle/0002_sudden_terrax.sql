ALTER TABLE "channels" ADD COLUMN "uploads_playlist_id" text;--> statement-breakpoint
ALTER TABLE "channels" ADD COLUMN "last_synced_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "channels" ADD COLUMN "sync_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "channels" ADD COLUMN "sync_window_started_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "comments" ADD COLUMN "youtube_comment_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_youtube_comment_id_unique" UNIQUE("youtube_comment_id");