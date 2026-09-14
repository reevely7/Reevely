ALTER TABLE "subscriptions" ALTER COLUMN "billing_key" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "subscriptions" ALTER COLUMN "toss_customer_key" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "is_promotional" boolean DEFAULT false NOT NULL;