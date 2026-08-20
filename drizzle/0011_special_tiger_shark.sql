CREATE TYPE "public"."notification_type" AS ENUM('new_comment', 'repeat_author', 'review_backlog', 'video_spike', 'weekly_digest');--> statement-breakpoint
CREATE TABLE "notification_settings" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"dnd_enabled" boolean DEFAULT false NOT NULL,
	"dnd_start_hour" integer DEFAULT 22 NOT NULL,
	"dnd_end_hour" integer DEFAULT 8 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "notifications" ALTER COLUMN "comment_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "type" "notification_type" DEFAULT 'new_comment' NOT NULL;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "title" text;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "message" text;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "href" text;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "ref_id" text;