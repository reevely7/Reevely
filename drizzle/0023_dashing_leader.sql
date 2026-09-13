CREATE TABLE "suspended_users" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"suspended_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reason" text
);
