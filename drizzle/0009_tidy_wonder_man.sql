CREATE TYPE "public"."video_type" AS ENUM('video', 'shorts');--> statement-breakpoint
ALTER TABLE "comments" ADD COLUMN "video_title" text;--> statement-breakpoint
ALTER TABLE "comments" ADD COLUMN "video_type" "video_type";