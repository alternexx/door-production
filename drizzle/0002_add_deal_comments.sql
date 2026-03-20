CREATE TABLE IF NOT EXISTS "deal_comments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "deal_id" uuid NOT NULL,
  "content" text NOT NULL,
  "author_id" uuid NOT NULL,
  "author_name" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp,
  "deleted_at" timestamp
);

DO $$ BEGIN
  ALTER TABLE "deal_comments"
    ADD CONSTRAINT "deal_comments_deal_id_deals_id_fk"
    FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "deal_comments"
    ADD CONSTRAINT "deal_comments_author_id_users_id_fk"
    FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
