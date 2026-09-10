CREATE TYPE "public"."channel_status" AS ENUM('active', 'locked');--> statement-breakpoint
ALTER TABLE "channels" DROP CONSTRAINT "channels_user_platform_unique";--> statement-breakpoint
ALTER TABLE "author_subscriptions" ADD COLUMN "channel_id" uuid;--> statement-breakpoint
ALTER TABLE "channels" ADD COLUMN "status" "channel_status" DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "comments" ADD COLUMN "channel_id" uuid;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "channel_id" uuid;--> statement-breakpoint
ALTER TABLE "channels" ADD CONSTRAINT "channels_user_youtube_unique" UNIQUE("user_id","youtube_channel_id");