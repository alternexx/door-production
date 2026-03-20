-- Add new tables for Tasks, Contacts History, Showing History, Task History
-- Run this manually or via drizzle-kit

-- Tasks table
CREATE TABLE IF NOT EXISTS "tasks" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "deal_id" uuid NOT NULL REFERENCES "deals"("id"),
  "title" text NOT NULL,
  "description" text,
  "due_date" timestamp,
  "assigned_to" uuid REFERENCES "users"("id"),
  "status" text DEFAULT 'pending' NOT NULL,
  "priority" text DEFAULT 'normal' NOT NULL,
  "completed_at" timestamp,
  "completed_by" uuid REFERENCES "users"("id"),
  "created_by" uuid NOT NULL REFERENCES "users"("id"),
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Task history table
CREATE TABLE IF NOT EXISTS "task_history" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "task_id" uuid NOT NULL REFERENCES "tasks"("id"),
  "action" text NOT NULL,
  "old_value" text,
  "new_value" text,
  "changed_by" uuid NOT NULL REFERENCES "users"("id"),
  "changed_at" timestamp DEFAULT now() NOT NULL
);

-- Showing history table
CREATE TABLE IF NOT EXISTS "showing_history" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "showing_id" uuid NOT NULL REFERENCES "showings"("id"),
  "action" text NOT NULL,
  "old_value" text,
  "new_value" text,
  "changed_by" uuid NOT NULL REFERENCES "users"("id"),
  "changed_at" timestamp DEFAULT now() NOT NULL
);

-- Contact history table
CREATE TABLE IF NOT EXISTS "contact_history" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "contact_id" uuid NOT NULL REFERENCES "contacts"("id"),
  "action" text NOT NULL,
  "deal_id" uuid,
  "old_value" text,
  "new_value" text,
  "changed_by" uuid NOT NULL REFERENCES "users"("id"),
  "changed_at" timestamp DEFAULT now() NOT NULL
);

-- Add new columns to showings table
ALTER TABLE "showings" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'scheduled' NOT NULL;
ALTER TABLE "showings" ADD COLUMN IF NOT EXISTS "cancelled_at" timestamp;
ALTER TABLE "showings" ADD COLUMN IF NOT EXISTS "cancel_reason" text;
ALTER TABLE "showings" ADD COLUMN IF NOT EXISTS "rescheduled_from" uuid REFERENCES "showings"("id");
