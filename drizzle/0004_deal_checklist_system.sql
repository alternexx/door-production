CREATE TABLE "checklist_templates" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "deal_type" text NOT NULL,
  "items" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "deal_checklist_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "deal_id" uuid NOT NULL,
  "template_item_label" text NOT NULL,
  "completed" boolean DEFAULT false NOT NULL,
  "completed_at" timestamp,
  "completed_by" uuid,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

ALTER TABLE "deal_checklist_items"
  ADD CONSTRAINT "deal_checklist_items_deal_id_deals_id_fk"
  FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE no action ON UPDATE no action;

ALTER TABLE "deal_checklist_items"
  ADD CONSTRAINT "deal_checklist_items_completed_by_users_id_fk"
  FOREIGN KEY ("completed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;

CREATE UNIQUE INDEX "deal_checklist_items_deal_label_unique"
  ON "deal_checklist_items" USING btree ("deal_id", "template_item_label");
