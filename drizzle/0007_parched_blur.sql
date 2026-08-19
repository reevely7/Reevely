CREATE TYPE "public"."platform" AS ENUM('youtube', 'instagram');--> statement-breakpoint
ALTER TABLE "channels" DROP CONSTRAINT "channels_user_id_unique";--> statement-breakpoint
ALTER TABLE "comments" DROP CONSTRAINT "comments_youtube_comment_id_unique";--> statement-breakpoint
ALTER TABLE "channels" ADD COLUMN "platform" "platform" DEFAULT 'youtube' NOT NULL;--> statement-breakpoint
ALTER TABLE "comments" ADD COLUMN "platform" "platform" DEFAULT 'youtube' NOT NULL;--> statement-breakpoint
ALTER TABLE "channels" ADD CONSTRAINT "channels_user_platform_unique" UNIQUE("user_id","platform");--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_platform_comment_unique" UNIQUE("platform","youtube_comment_id");