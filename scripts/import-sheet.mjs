/**
 * DOOR — Master Sheet Importer
 * Reads Fried Maaba xlsx, auto-creates missing pipeline stages,
 * and inserts all deals + agents into the DB.
 */
import { neon } from "@neondatabase/serverless";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { createRequire } from "module";
import * as dotenv from "dotenv";

const require = createRequire(import.meta.url);
dotenv.config({ path: join(dirname(fileURLToPath(import.meta.url)), "../.env.local") });

const xlsx = require("xlsx");
const sql = neon(process.env.DATABASE_URL);

// ── Config ────────────────────────────────────────────────────────
const XLSX_FILE =
  "/Users/homefolder/.openclaw/media/inbound/Mar_17_Fried_Maaba_Master_Sheet_2---7650ec7e-7388-4ead-94ec-68465d702776.xlsx";

// Mark's user ID = import system user
const SYSTEM_USER_ID = "f8cc0af6-7aaa-47ee-90d7-f10ce5c2bb44";

// Default color for auto-created stages
const DEFAULT_STAGE_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f43f5e", "#f97316",
  "#eab308", "#84cc16", "#22c55e", "#14b8a6", "#06b6d4",
];

// ── Load users from DB ────────────────────────────────────────────
async function loadUsers() {
  const rows = await sql`SELECT id, name FROM users`;
  const map = {};
  for (const r of rows) {
    map[r.name.trim().toLowerCase()] = r.id;
  }
  return map;
}

// ── Load + index stages from DB ───────────────────────────────────
async function loadStages() {
  const rows = await sql`SELECT id, deal_type, name, order_index FROM pipeline_stages ORDER BY deal_type, order_index`;
  // map: dealType → { normalizedName → { id, order_index } }
  const map = {};
  for (const r of rows) {
    if (!map[r.deal_type]) map[r.deal_type] = {};
    map[r.deal_type][r.name.trim().toLowerCase()] = { id: r.id, orderIndex: r.order_index };
  }
  return map;
}

// ── Auto-create a missing stage ───────────────────────────────────
async function createStage(dealType, stageName, stagesMap) {
  const existing = stagesMap[dealType] ?? {};
  const maxOrder = Object.values(existing).reduce((m, v) => Math.max(m, v.orderIndex), -1);
  const newOrder = maxOrder + 1;
  const color = DEFAULT_STAGE_COLORS[newOrder % DEFAULT_STAGE_COLORS.length];

  console.log(`  ➕ Creating stage "${stageName}" for ${dealType} (order ${newOrder})`);

  const [created] = await sql`
    INSERT INTO pipeline_stages (id, deal_type, name, color, order_index, is_closed_won, is_closed_lost, created_at)
    VALUES (gen_random_uuid(), ${dealType}, ${stageName}, ${color}, ${newOrder}, false, false, NOW())
    RETURNING id, order_index
  `;

  if (!stagesMap[dealType]) stagesMap[dealType] = {};
  stagesMap[dealType][stageName.trim().toLowerCase()] = { id: created.id, orderIndex: created.order_index };
  return created.id;
}

// ── Resolve stage (create if missing) ────────────────────────────
async function resolveStage(dealType, stageName, stagesMap) {
  if (!stageName) return null;
  const normalized = stageName.trim().toLowerCase();
  const existing = stagesMap[dealType]?.[normalized];
  if (existing) return existing.id;

  // Not found — create it
  return await createStage(dealType, stageName.trim(), stagesMap);
}

// ── Parse price (handles "$2,950.00" and 4000.0) ─────────────────
function parsePrice(val) {
  if (!val) return null;
  if (typeof val === "number") return Math.round(val);
  const str = String(val).replace(/[$,]/g, "").trim();
  const n = parseFloat(str);
  return isNaN(n) ? null : Math.round(n);
}

// ── Resolve agent IDs from name strings ──────────────────────────
function resolveAgents(usersMap, ...names) {
  const ids = [];
  for (const name of names) {
    if (!name) continue;
    // Handle comma-separated (e.g., "James, Mark")
    const parts = String(name).split(",");
    for (const part of parts) {
      const id = usersMap[part.trim().toLowerCase()];
      if (id && !ids.includes(id)) ids.push(id);
    }
  }
  return ids;
}

// ── Check if deal already imported ───────────────────────────────
async function dealExists(title, dealType) {
  const rows = await sql`SELECT id FROM deals WHERE title = ${title} AND deal_type = ${dealType} LIMIT 1`;
  return rows.length > 0;
}

// ── Insert a deal + agents ────────────────────────────────────────
async function insertDeal({ dealType, title, address, borough, price, stageId, notes, status, agentIds }) {
  const [deal] = await sql`
    INSERT INTO deals (
      id, deal_type, title, address, borough, price, stage_id,
      notes, status, created_by, created_at, updated_at
    ) VALUES (
      gen_random_uuid(),
      ${dealType},
      ${title},
      ${address || title},
      ${borough || ""},
      ${price},
      ${stageId},
      ${notes || null},
      ${status},
      ${SYSTEM_USER_ID},
      NOW(), NOW()
    )
    RETURNING id
  `;

  for (const userId of agentIds) {
    await sql`
      INSERT INTO deal_agents (id, deal_id, user_id, assigned_at)
      VALUES (gen_random_uuid(), ${deal.id}, ${userId}, NOW())
      ON CONFLICT DO NOTHING
    `;
  }

  // Seed stage history
  await sql`
    INSERT INTO deal_stage_history (id, deal_id, stage_id, stage_name, entered_at, changed_by, created_at)
    SELECT gen_random_uuid(), ${deal.id}, ps.id, ps.name, NOW(), ${SYSTEM_USER_ID}, NOW()
    FROM pipeline_stages ps WHERE ps.id = ${stageId}
  `;

  return deal.id;
}

// ── Sheet parsers ─────────────────────────────────────────────────

async function parseRentals(ws, dealType, status, usersMap, stagesMap) {
  const rows = xlsx.utils.sheet_to_json(ws, { header: 1 });
  const deals = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const property = r[0];
    if (!property) continue;
    deals.push({
      dealType,
      title: String(property).trim(),
      address: String(property).trim(),
      borough: r[4] ? String(r[4]).trim() : "",
      price: parsePrice(r[5]),
      stageName: r[6] ? String(r[6]).trim() : null,
      notes: [r[8] ? `Applicant: ${r[8]}` : null, r[9] ? String(r[9]) : null].filter(Boolean).join("\n") || null,
      status,
      agentIds: resolveAgents(usersMap, r[1], r[2], r[3]),
    });
  }
  return deals;
}

async function parseSellers(ws, dealType, status, usersMap, stagesMap) {
  const rows = xlsx.utils.sheet_to_json(ws, { header: 1 });
  const deals = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const property = r[0];
    if (!property) continue;
    deals.push({
      dealType,
      title: String(property).trim(),
      address: String(property).trim(),
      borough: r[4] ? String(r[4]).trim() : "",
      price: parsePrice(r[5]),
      stageName: r[6] ? String(r[6]).trim() : null,
      notes: r[7] ? String(r[7]).trim() : null,
      status,
      agentIds: resolveAgents(usersMap, r[1], r[2], r[3]),
    });
  }
  return deals;
}

async function parseBuyers(ws, dealType, status, usersMap, stagesMap) {
  const rows = xlsx.utils.sheet_to_json(ws, { header: 1 });
  const deals = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const client = r[0];
    if (!client) continue;
    deals.push({
      dealType,
      title: String(client).trim(),
      address: String(client).trim(), // client name as address for buyers
      borough: r[4] ? String(r[4]).trim() : "",
      price: parsePrice(r[5]),
      stageName: r[6] ? String(r[6]).trim() : null,
      notes: r[8] ? String(r[8]).trim() : null,
      status,
      agentIds: resolveAgents(usersMap, r[1], r[2], r[3]),
    });
  }
  return deals;
}

async function parseApplications(ws, dealType, status, usersMap, stagesMap) {
  const rows = xlsx.utils.sheet_to_json(ws, { header: 1 });
  const deals = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const applicant = r[0];
    if (!applicant) continue;
    deals.push({
      dealType,
      title: String(applicant).trim(),
      address: r[1] ? String(r[1]).trim() : String(applicant).trim(),
      borough: "",
      price: null,
      stageName: r[3] ? String(r[3]).trim() : null,
      notes: r[7] ? String(r[7]).trim() : null,
      status,
      agentIds: resolveAgents(usersMap, r[2]),
    });
  }
  return deals;
}

async function parseTenantRep(ws, dealType, status, usersMap, stagesMap) {
  const rows = xlsx.utils.sheet_to_json(ws, { header: 1 });
  const deals = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const client = r[0];
    if (!client) continue;
    deals.push({
      dealType,
      title: String(client).trim(),
      address: String(client).trim(),
      borough: r[4] ? String(r[4]).trim() : "",
      price: null,
      stageName: r[5] ? String(r[5]).trim() : null,
      notes: r[6] ? String(r[6]).trim() : null,
      status,
      agentIds: resolveAgents(usersMap, r[1], r[2], r[3]),
    });
  }
  return deals;
}

// ── Main ──────────────────────────────────────────────────────────
async function main() {
  console.log("📥 Loading workbook...");
  const wb = xlsx.readFile(XLSX_FILE);

  console.log("👥 Loading users...");
  const usersMap = await loadUsers();
  console.log("  Users:", Object.keys(usersMap).join(", "));

  console.log("🗂️  Loading stages...");
  const stagesMap = await loadStages();

  const sheetGroups = [
    { sheet: "Rentals",               dealType: "rental",      status: "active",   parser: parseRentals },
    { sheet: "Rental Archive",        dealType: "rental",      status: "archived", parser: parseRentals },
    { sheet: "Sellers",               dealType: "seller",      status: "active",   parser: parseSellers },
    { sheet: "Sellers Archive",       dealType: "seller",      status: "archived", parser: parseSellers },
    { sheet: "Buyers",                dealType: "buyer",       status: "active",   parser: parseBuyers },
    { sheet: "Buyers Archive",        dealType: "buyer",       status: "archived", parser: parseBuyers },
    { sheet: "Applications in Process", dealType: "application", status: "active", parser: parseApplications },
    { sheet: "Application Archive",   dealType: "application", status: "archived", parser: parseApplications },
    { sheet: "Tenant Rep",            dealType: "tenant_rep",  status: "active",   parser: parseTenantRep },
    { sheet: "Tenant Rep Archive",    dealType: "tenant_rep",  status: "archived", parser: parseTenantRep },
  ];

  let totalInserted = 0;
  let totalSkipped = 0;
  let stagesCreated = 0;

  for (const { sheet, dealType, status, parser } of sheetGroups) {
    const ws = wb.Sheets[sheet];
    if (!ws) { console.log(`⚠️  Sheet "${sheet}" not found, skipping`); continue; }

    console.log(`\n📋 Processing "${sheet}" → ${dealType} (${status})`);
    const dealRows = await parser(ws, dealType, status, usersMap, stagesMap);

    for (const row of dealRows) {
      // Resolve stage (auto-creates if missing)
      const stagesBefore = Object.keys(stagesMap[dealType] ?? {}).length;
      row.stageId = row.stageName ? await resolveStage(dealType, row.stageName, stagesMap) : null;
      const stagesAfter = Object.keys(stagesMap[dealType] ?? {}).length;
      if (stagesAfter > stagesBefore) stagesCreated++;

      if (!row.stageId) {
        console.log(`  ⚠️  No stage for "${row.title}" — skipping`);
        totalSkipped++;
        continue;
      }

      // Check duplicate
      const exists = await dealExists(row.title, dealType);
      if (exists) {
        console.log(`  ⏭️  Already exists: "${row.title}"`);
        totalSkipped++;
        continue;
      }

      await insertDeal(row);
      console.log(`  ✅ Inserted: "${row.title}" [${row.stageName}] agents: ${row.agentIds.length}`);
      totalInserted++;
    }
  }

  console.log(`\n🎉 Done! ${totalInserted} deals inserted, ${totalSkipped} skipped, ${stagesCreated} new stages created.`);
}

main().catch((e) => { console.error("❌ Error:", e); process.exit(1); });
