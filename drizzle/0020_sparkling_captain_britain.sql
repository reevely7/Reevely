ALTER TYPE "public"."notification_type" ADD VALUE 'reauth_required';--> statement-breakpoint
ALTER TABLE "channels" ADD COLUMN "reauth_required_at" timestamp with time zone;