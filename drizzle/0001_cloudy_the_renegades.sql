CREATE TABLE "channels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"youtube_channel_id" text NOT NULL,
	"channel_title" text NOT NULL,
	"thumbnail_url" text,
	"subscriber_count" integer,
	"refresh_token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "channels_user_id_unique" UNIQUE("user_id")
);
