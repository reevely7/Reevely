CREATE TYPE "public"."comment_status" AS ENUM('confirmed', 'needs_review', 'reported_false', 'whitelisted');--> statement-breakpoint
CREATE TYPE "public"."risk_level" AS ENUM('high', 'medium', 'low');--> statement-breakpoint
CREATE TABLE "comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"video_id" text NOT NULL,
	"author_channel_id" text NOT NULL,
	"text" text NOT NULL,
	"risk_level" "risk_level",
	"category" text,
	"confidence" numeric(3, 2),
	"reason" text,
	"status" "comment_status" DEFAULT 'needs_review' NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"analyzed_at" timestamp with time zone
);
