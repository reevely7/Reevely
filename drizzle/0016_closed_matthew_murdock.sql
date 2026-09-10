ALTER TABLE "author_subscriptions" DROP CONSTRAINT "author_subscriptions_user_author_unique";--> statement-breakpoint
ALTER TABLE "author_subscriptions" ALTER COLUMN "channel_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "comments" ALTER COLUMN "channel_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "notifications" ALTER COLUMN "channel_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "author_subscriptions" ADD CONSTRAINT "author_subscriptions_channel_author_unique" UNIQUE("channel_id","author_channel_id");