CREATE TABLE "blanks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vendor" text NOT NULL,
	"name" text NOT NULL,
	"length_mm" double precision NOT NULL,
	"deck_length_mm" double precision,
	"volume_litres" double precision,
	"catalog_slug" text NOT NULL,
	"pdf_page" integer NOT NULL,
	"stations" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "blanks_vendor_name_idx" ON "blanks" USING btree ("vendor","name");