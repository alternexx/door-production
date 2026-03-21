/**
 * DOOR — Master Sheet Import
 * Imports from Fried Maaba Master Sheet into DOOR DB
 * as if each deal was manually added. History logged as System.
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

const XLSX_FILE = "/Users/homefolder/.openclaw/media/inbound/Fried_Maaba_Master_Sheet---ddbe0b08-bb5f-4671-8e00-81644f305675.xlsx";

// ── Load users ────────────────────────────────────────────────────
async function loadUsers() {
  const rows = await sql`SELECT id, name FROM users`;
  const map = {};
  for (const r of rows) {
    map[r.name.trim().toLowerCase()] = r.id;
  }
  return map;
}

// ── Load stages ───────────────────────────────────────────────────
async function loadStages() {
  const rows = await sql`SELECT id, deal_type, name FROM pipeline_stages`;
  const map = {};
  for (const r of rows) {
    if (!map[r.deal_type]) map[r.deal_type] = {};
    map[r.deal_type][r.name.trim().toLowerCase()] = r.id;
  }
  return map;
}

// ── Helper: resolve stage ID ──────────────────────────────────────
function resolveStage(stages, dealType, stageName, fallback) {
  const typeMap = stages[dealType] ?? {};
  const key = (stageName || "").trim().toLowerCase();
  if (typeMap[key]) return typeMap[key];
  // fuzzy: find stage containing the key
  for (const [k, id] of Object.entries(typeMap)) {
    if (k.includes(key) || key.includes(k)) return id;
  }
  // return fallback (first stage for that type)
  const values = Object.values(typeMap);
  return fallback || values[0];
}

// ── Helper: resolve agent IDs from comma/slash separated string ───
function resolveAgents(users, ...names) {
  const ids = [];
  for (const name of names) {
    if (!name) continue;
    // handle "James, Mark" style
    const parts = String(name).split(/[,\/]/).map(s => s.trim()).filter(Boolean);
    for (const part of parts) {
      const id = users[part.toLowerCase()];
      if (id && !ids.includes(id)) ids.push(id);
    }
  }
  return ids;
}

// ── Helper: clean price ───────────────────────────────────────────
function cleanPrice(val) {
  if (!val) return null;
  const str = String(val).replace(/[$,\s]/g, "");
  const num = Math.round(parseFloat(str));
  return isNaN(num) ? null : num;
}

// ── Insert deal ───────────────────────────────────────────────────
async function insertDeal({ dealType, title, address, borough, price, notes, stageId, agentIds, isArchived, systemUserId }) {
  const status = isArchived ? "archived" : "active";
  const archivedAt = isArchived ? new Date() : null;

  const addr = address || title;
  const bor = borough || "";
  const [deal] = await sql`
    INSERT INTO deals (deal_type, title, address, borough, price, notes, stage_id, status, archived_at, created_by, created_at, updated_at)
    VALUES (${dealType}, ${title}, ${addr}, ${bor}, ${price}, ${notes || null}, ${stageId}, ${status}, ${archivedAt}, ${systemUserId}, NOW(), NOW())
    RETURNING id
  `;

  // Insert agents
  for (const userId of agentIds) {
    await sql`
      INSERT INTO deal_agents (deal_id, user_id, assigned_at)
      VALUES (${deal.id}, ${userId}, NOW())
      ON CONFLICT DO NOTHING
    `;
  }

  // Insert stage history
  const [stageRow] = await sql`SELECT name FROM pipeline_stages WHERE id = ${stageId}`;
  await sql`
    INSERT INTO deal_stage_history (deal_id, stage_id, stage_name, entered_at, changed_by)
    VALUES (${deal.id}, ${stageId}, ${stageRow?.name || ''}, NOW(), ${systemUserId})
  `;

  // Log to deal_history as System
  const agentNames = agentIds.length > 0
    ? (await sql`SELECT name FROM users WHERE id = ANY(${agentIds})`).map(r => r.name).join(", ")
    : null;

  await sql`
    INSERT INTO deal_history (deal_id, deal_type, field, old_value, new_value, changed_by_id, changed_by_name, changed_at)
    VALUES (${deal.id}, ${dealType}, 'import', null, ${'Imported from spreadsheet'}, ${systemUserId}, 'System', NOW())
  `;

  return deal.id;
}

// ── Main ──────────────────────────────────────────────────────────
async function main() {
  const users = await loadUsers();
  const stages = await loadStages();
  const systemUserId = users["mark"];

  console.log("Users loaded:", Object.keys(users).join(", "));
  console.log("System user:", systemUserId);

  const wb = xlsx.readFile(XLSX_FILE);
  let total = 0;

  // ── RENTALS (active) ──────────────────────────────────────────
  {
    const sheet = wb.Sheets["Rentals"];
    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 }).filter(r => r && r.some(c => c));
    const headers = rows[0];
    // Property, Showing Agent, Agent 2, Agent 3, Borough, Price, Stage, App Link, Applicant, Notes
    for (const row of rows.slice(1)) {
      const title = row[0];
      if (!title) continue;
      const stageId = resolveStage(stages, "rental", row[6], null);
      const agentIds = resolveAgents(users, row[1], row[2], row[3]);
      await insertDeal({
        dealType: "rental",
        title: String(title).trim(),
        address: String(title).trim(),
        borough: row[4] || null,
        price: cleanPrice(row[5]),
        notes: row[9] || null,
        stageId,
        agentIds,
        isArchived: false,
        systemUserId,
      });
      total++;
    }
    console.log(`Rentals: ${rows.length - 1} deals`);
  }

  // ── RENTALS ARCHIVE ───────────────────────────────────────────
  {
    const sheet = wb.Sheets["Rental Archive"];
    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 }).filter(r => r && r.some(c => c));
    // All go to "Rented / Invoice Sent"
    const stageId = resolveStage(stages, "rental", "rented / invoice sent", null);
    for (const row of rows.slice(1)) {
      const title = row[0];
      if (!title) continue;
      const agentIds = resolveAgents(users, row[1], row[2], row[3]);
      await insertDeal({
        dealType: "rental",
        title: String(title).trim(),
        address: String(title).trim(),
        borough: row[4] || null,
        price: cleanPrice(row[5]),
        notes: row[9] || null,
        stageId,
        agentIds,
        isArchived: true,
        systemUserId,
      });
      total++;
    }
    console.log(`Rental Archive: ${rows.length - 1} deals → Rented / Invoice Sent`);
  }

  // ── SELLERS (active) ──────────────────────────────────────────
  {
    const sheet = wb.Sheets["Sellers"];
    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 }).filter(r => r && r.some(c => c));
    // Property, Agent 1, Agent 2, Agent 3, Borough, Price, Stage, Notes
    for (const row of rows.slice(1)) {
      const title = row[0];
      if (!title) continue;
      const stageId = resolveStage(stages, "seller", row[6], null);
      const agentIds = resolveAgents(users, row[1], row[2], row[3]);
      await insertDeal({
        dealType: "seller",
        title: String(title).trim(),
        address: String(title).trim(),
        borough: row[4] || null,
        price: cleanPrice(row[5]),
        notes: row[7] || null,
        stageId,
        agentIds,
        isArchived: false,
        systemUserId,
      });
      total++;
    }
    console.log(`Sellers: ${rows.length - 1} deals`);
  }

  // ── BUYERS (active) ───────────────────────────────────────────
  {
    const sheet = wb.Sheets["Buyers"];
    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 }).filter(r => r && r.some(c => c));
    // Client, Agent 1, Agent 2, Agent 3, Borough, Budget, Stage, Showsheet, Notes
    for (const row of rows.slice(1)) {
      const title = row[0];
      if (!title) continue;
      const stageId = resolveStage(stages, "buyer", row[6], null);
      const agentIds = resolveAgents(users, row[1], row[2], row[3]);
      await insertDeal({
        dealType: "buyer",
        title: String(title).trim(),
        address: null,
        borough: row[4] || null,
        price: cleanPrice(row[5]),
        notes: row[8] || null,
        stageId,
        agentIds,
        isArchived: false,
        systemUserId,
      });
      total++;
    }
    console.log(`Buyers: ${rows.length - 1} deals`);
  }

  // ── BUYERS ARCHIVE ────────────────────────────────────────────
  {
    const sheet = wb.Sheets["Buyers Archive"];
    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 }).filter(r => r && r.some(c => c));
    // All go to "Buyer Found Elsewhere"
    const stageId = resolveStage(stages, "buyer", "buyer found elsewhere", null);
    for (const row of rows.slice(1)) {
      const title = row[0];
      if (!title) continue;
      const agentIds = resolveAgents(users, row[1], row[2], row[3]);
      await insertDeal({
        dealType: "buyer",
        title: String(title).trim(),
        address: null,
        borough: row[4] || null,
        price: cleanPrice(row[5]),
        notes: row[8] || null,
        stageId,
        agentIds,
        isArchived: true,
        systemUserId,
      });
      total++;
    }
    console.log(`Buyers Archive: ${rows.length - 1} deals → Buyer Found Elsewhere`);
  }

  // ── APPLICATIONS (active) ─────────────────────────────────────
  {
    const sheet = wb.Sheets["Applications in Process"];
    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 }).filter(r => r && r.some(c => c));
    // Applicant, Address, Agent, Stage, Email, Phone, Move-in Date, Notes
    for (const row of rows.slice(1)) {
      const title = row[0];
      if (!title) continue;
      const stageId = resolveStage(stages, "application", row[3], null);
      const agentIds = resolveAgents(users, row[2]);
      await insertDeal({
        dealType: "application",
        title: String(title).trim(),
        address: row[1] || null,
        borough: null,
        price: null,
        notes: row[7] || null,
        stageId,
        agentIds,
        isArchived: false,
        systemUserId,
      });
      total++;
    }
    console.log(`Applications: ${rows.length - 1} deals`);
  }

  // ── APPLICATIONS ARCHIVE ──────────────────────────────────────
  {
    const sheet = wb.Sheets["Application Archive"];
    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 }).filter(r => r && r.some(c => c));
    // Stage mapping
    const stageMap = {
      "rental backed out": resolveStage(stages, "application", "applicant withdrew", null),
      "rental rejected": resolveStage(stages, "application", "rental rejected", null),
      "moved in closed": resolveStage(stages, "application", "moved in/closed", null),
    };
    for (const row of rows.slice(1)) {
      const title = row[0];
      if (!title) continue;
      const stageKey = (row[3] || "").trim().toLowerCase();
      const stageId = stageMap[stageKey] || resolveStage(stages, "application", stageKey, null);
      const agentIds = resolveAgents(users, row[2]);
      await insertDeal({
        dealType: "application",
        title: String(title).trim(),
        address: row[1] || null,
        borough: null,
        price: null,
        notes: row[7] || null,
        stageId,
        agentIds,
        isArchived: true,
        systemUserId,
      });
      total++;
    }
    console.log(`Application Archive: ${rows.length - 1} deals`);
  }

  // ── TENANT REP (active) ───────────────────────────────────────
  {
    const sheet = wb.Sheets["Tenant Rep"];
    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 }).filter(r => r && r.some(c => c));
    // Client, Agent 1, Agent 2, Agent 3, Borough, Stage, Notes
    for (const row of rows.slice(1)) {
      const title = row[0];
      if (!title) continue;
      const stageId = resolveStage(stages, "tenant_rep", row[5], null);
      const agentIds = resolveAgents(users, row[1], row[2], row[3]);
      await insertDeal({
        dealType: "tenant_rep",
        title: String(title).trim(),
        address: null,
        borough: row[4] || null,
        price: null,
        notes: row[6] || null,
        stageId,
        agentIds,
        isArchived: false,
        systemUserId,
      });
      total++;
    }
    console.log(`Tenant Rep: ${rows.length - 1} deals`);
  }

  console.log(`\n✅ Import complete — ${total} deals inserted`);
}

main().catch(e => { console.error("Import failed:", e.message); process.exit(1); });
