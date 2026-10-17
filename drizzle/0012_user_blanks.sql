CREATE TABLE "user_blanks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_user_id" text NOT NULL,
	"copy" jsonb NOT NULL,
	"rocker" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "user_blanks_clerk_user_id_idx" ON "user_blanks" USING btree ("clerk_user_id");