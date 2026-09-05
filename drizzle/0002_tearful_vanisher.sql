CREATE TABLE "user_preferences" (
	"clerk_user_id" text PRIMARY KEY NOT NULL,
	"units" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
