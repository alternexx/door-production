import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL!);

async function push() {
  console.log("Pushing v3 schema to Neon DB...");
  console.log("Dropping v2 tables...");

  // Drop v2 tables in dependency order
  await sql`DROP TABLE IF EXISTS lead_pool_agents CASCADE`;
  await sql`DROP TABLE IF EXISTS deal_agents CASCADE`;
  await sql`DROP TABLE IF EXISTS deal_checklist_items CASCADE`;
  await sql`DROP TABLE IF EXISTS checklist_templates CASCADE`;
  await sql`DROP TABLE IF EXISTS deal_comments CASCADE`;
  await sql`DROP TABLE IF EXISTS deal_history CASCADE`;
  await sql`DROP TABLE IF EXISTS stage_history CASCADE`;
  await sql`DROP TABLE IF EXISTS deal_contacts CASCADE`;
  await sql`DROP TABLE IF EXISTS deal_stage_history CASCADE`;
  await sql`DROP TABLE IF EXISTS showings CASCADE`;
  await sql`DROP TABLE IF EXISTS applications CASCADE`;
  await sql`DROP TABLE IF EXISTS buyers CASCADE`;
  await sql`DROP TABLE IF EXISTS sellers CASCADE`;
  await sql`DROP TABLE IF EXISTS rentals CASCADE`;
  await sql`DROP TABLE IF EXISTS tenant_rep CASCADE`;
  await sql`DROP TABLE IF EXISTS lead_pool CASCADE`;
  await sql`DROP TABLE IF EXISTS deals CASCADE`;
  await sql`DROP TABLE IF EXISTS contacts CASCADE`;
  await sql`DROP TABLE IF EXISTS buildings CASCADE`;
  await sql`DROP TABLE IF EXISTS landlords CASCADE`;
  await sql`DROP TABLE IF EXISTS pipeline_stages CASCADE`;
  await sql`DROP TABLE IF EXISTS app_settings CASCADE`;
  await sql`DROP TABLE IF EXISTS users CASCADE`;
  console.log("✓ Old tables dropped");

  // Create v3 tables
  await sql`
    CREATE TABLE users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      clerk_id TEXT UNIQUE NOT NULL,
      email TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'agent',
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP NOT NULL DEFAULT now(),
      updated_at TIMESTAMP NOT NULL DEFAULT now()
    )
  `;
  console.log("✓ users");

  await sql`
    CREATE TABLE pipeline_stages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      deal_type TEXT NOT NULL,
      name TEXT NOT NULL,
      color TEXT NOT NULL,
      order_index INTEGER NOT NULL,
      is_closed_won BOOLEAN NOT NULL DEFAULT false,
      is_closed_lost BOOLEAN NOT NULL DEFAULT false,
      stale_threshold_days INTEGER,
      created_at TIMESTAMP NOT NULL DEFAULT now()
    )
  `;
  console.log("✓ pipeline_stages");

  await sql`
    CREATE TABLE deals (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      deal_type TEXT NOT NULL,
      title TEXT NOT NULL,
      address TEXT NOT NULL,
      unit TEXT,
      borough TEXT NOT NULL,
      neighborhood TEXT,
      zip TEXT,
      building_id UUID,
      price INTEGER,
      status TEXT NOT NULL DEFAULT 'active',
      source TEXT,
      notes TEXT,
      stage_id UUID NOT NULL REFERENCES pipeline_stages(id),
      lease_start_date DATE,
      lease_end_date DATE,
      listed_at TIMESTAMP,
      archived_at TIMESTAMP,
      archive_reason TEXT,
      showing_scheduled_at TIMESTAMP,
      showing_agent_id UUID REFERENCES users(id),
      commission_data JSONB,
      created_by UUID NOT NULL REFERENCES users(id),
      created_at TIMESTAMP NOT NULL DEFAULT now(),
      updated_at TIMESTAMP NOT NULL DEFAULT now()
    )
  `;
  console.log("✓ deals");

  await sql`
    CREATE TABLE deal_agents (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      deal_id UUID NOT NULL REFERENCES deals(id),
      user_id UUID NOT NULL REFERENCES users(id),
      assigned_at TIMESTAMP NOT NULL DEFAULT now(),
      removed_at TIMESTAMP
    )
  `;
  console.log("✓ deal_agents");

  await sql`
    CREATE TABLE checklist_templates (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      deal_type TEXT NOT NULL,
      items JSONB NOT NULL DEFAULT '[]'::jsonb,
      created_at TIMESTAMP NOT NULL DEFAULT now(),
      updated_at TIMESTAMP NOT NULL DEFAULT now()
    )
  `;
  console.log("✓ checklist_templates");

  await sql`
    CREATE TABLE deal_checklist_items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      deal_id UUID NOT NULL REFERENCES deals(id),
      template_item_label TEXT NOT NULL,
      completed BOOLEAN NOT NULL DEFAULT false,
      completed_at TIMESTAMP,
      completed_by UUID REFERENCES users(id),
      created_at TIMESTAMP NOT NULL DEFAULT now(),
      updated_at TIMESTAMP NOT NULL DEFAULT now()
    )
  `;
  await sql`
    CREATE UNIQUE INDEX deal_checklist_items_deal_label_unique
    ON deal_checklist_items (deal_id, template_item_label)
  `;
  console.log("✓ deal_checklist_items");

  await sql`
    CREATE TABLE deal_stage_history (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      deal_id UUID NOT NULL REFERENCES deals(id),
      stage_id UUID NOT NULL REFERENCES pipeline_stages(id),
      stage_name TEXT NOT NULL,
      entered_at TIMESTAMP NOT NULL DEFAULT now(),
      exited_at TIMESTAMP,
      duration_seconds INTEGER,
      changed_by UUID NOT NULL REFERENCES users(id),
      created_at TIMESTAMP NOT NULL DEFAULT now()
    )
  `;
  console.log("✓ deal_stage_history");

  await sql`
    CREATE TABLE deal_history (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      deal_id UUID NOT NULL REFERENCES deals(id),
      deal_type TEXT NOT NULL,
      field TEXT NOT NULL,
      old_value TEXT,
      new_value TEXT,
      changed_by_id UUID NOT NULL REFERENCES users(id),
      changed_by_name TEXT NOT NULL,
      changed_at TIMESTAMP NOT NULL DEFAULT now()
    )
  `;
  console.log("✓ deal_history");

  await sql`
    CREATE TABLE deal_comments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      deal_id UUID NOT NULL REFERENCES deals(id),
      content TEXT NOT NULL,
      author_id UUID NOT NULL REFERENCES users(id),
      author_name TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT now(),
      updated_at TIMESTAMP,
      deleted_at TIMESTAMP
    )
  `;
  console.log("✓ deal_comments");

  await sql`
    CREATE TABLE showings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      deal_id UUID NOT NULL REFERENCES deals(id),
      agent_id UUID NOT NULL REFERENCES users(id),
      scheduled_at TIMESTAMP NOT NULL,
      status TEXT NOT NULL DEFAULT 'scheduled',
      feedback_reaction TEXT,
      feedback_notes TEXT,
      sign_in_count INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT now()
    )
  `;
  console.log("✓ showings");

  await sql`
    CREATE TABLE contacts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      full_name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT now(),
      updated_at TIMESTAMP NOT NULL DEFAULT now()
    )
  `;
  console.log("✓ contacts");

  await sql`
    CREATE TABLE deal_contacts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      deal_id UUID NOT NULL REFERENCES deals(id),
      contact_id UUID NOT NULL REFERENCES contacts(id),
      role TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT now()
    )
  `;
  console.log("✓ deal_contacts");

  await sql`
    CREATE TABLE landlords (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      preferred_contact TEXT,
      management_company TEXT,
      notes TEXT,
      co_broke BOOLEAN NOT NULL DEFAULT false,
      co_broke_terms TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT now(),
      updated_at TIMESTAMP NOT NULL DEFAULT now()
    )
  `;
  console.log("✓ landlords");

  await sql`
    CREATE TABLE buildings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      address TEXT NOT NULL,
      borough TEXT NOT NULL,
      neighborhood TEXT,
      zip TEXT,
      landlord_id UUID REFERENCES landlords(id),
      amenities JSONB,
      key_access TEXT,
      owner_name TEXT,
      owner_phone TEXT,
      owner_email TEXT,
      management_company TEXT,
      notes TEXT,
      photos JSONB,
      created_at TIMESTAMP NOT NULL DEFAULT now(),
      updated_at TIMESTAMP NOT NULL DEFAULT now()
    )
  `;
  console.log("✓ buildings");

  console.log("\nV3 schema push complete!");
}

push().catch((err) => {
  console.error("Push failed:", err);
  process.exit(1);
});
