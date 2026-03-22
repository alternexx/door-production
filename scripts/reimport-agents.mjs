import { neon } from "@neondatabase/serverless";
import XLSX from "xlsx";
import { randomUUID } from "crypto";

const DB_URL =
  "postgresql://neondb_owner:npg_p5WtvqnLrb8R@ep-calm-cell-akcl8mri.c-3.us-west-2.aws.neon.tech/neondb?sslmode=require";
const sql = neon(DB_URL);

const EXCEL = "/tmp/master_sheet.xlsx";

// ── helpers ──────────────────────────────────────────────────────────
function normalizeTitle(s) {
  if (!s) return "";
  return String(s).trim().toLowerCase().replace(/\s+/g, " ");
}

function resolveUser(name, usersMap) {
  if (!name) return null;
  const n = name.trim();
  if (!n) return null;
  const lower = n.toLowerCase();
  // exact match first
  if (usersMap.has(lower)) return usersMap.get(lower);
  // first-name match
  for (const [key, user] of usersMap) {
    const firstName = key.split(" ")[0];
    if (firstName === lower) return user;
  }
  return null;
}

// ── main ─────────────────────────────────────────────────────────────
const wb = XLSX.readFile(EXCEL);

// Load all users
const allUsers = await sql`SELECT id, name FROM users ORDER BY name`;
const usersMap = new Map();
for (const u of allUsers) {
  if (u.name === "[deleted]") continue;
  usersMap.set(u.name.toLowerCase(), u);
}
console.log(`Loaded ${usersMap.size} users`);

// Load all deals
const allDeals = await sql`SELECT id, title, address, deal_type FROM deals`;
const dealsByTitle = new Map();
for (const d of allDeals) {
  const key = normalizeTitle(d.title);
  if (key) dealsByTitle.set(key, d);
  const aKey = normalizeTitle(d.address);
  if (aKey && aKey !== key) dealsByTitle.set(aKey, d);
}
console.log(`Loaded ${allDeals.length} deals\n`);

// Sheet configs
const sheetConfigs = [
  {
    name: "Rentals",
    titleCol: "Property",
    agentCols: ["Showing Agent", "Agent 2", "Agent 3"],
  },
  {
    name: "Sellers",
    titleCol: "Property",
    agentCols: ["Agent 1", "Agent 2", "Agent 3"],
  },
  {
    name: "Buyers",
    titleCol: "Client",
    agentCols: ["Agent 1", "Agent 2", "Agent 3"],
  },
  {
    name: "Applications in Process",
    titleCol: "Address",
    agentCols: ["Agent"],
  },
  {
    name: "Tenant Rep",
    titleCol: "Client",
    agentCols: ["Agent 1", "Agent 2", "Agent 3"],
  },
];

let totalUpdated = 0;
let totalSkipped = 0;
let totalCleared = 0;
let totalInserted = 0;

for (const cfg of sheetConfigs) {
  const ws = wb.Sheets[cfg.name];
  if (!ws) {
    console.log(`Sheet "${cfg.name}" not found, skipping`);
    continue;
  }
  const rows = XLSX.utils.sheet_to_json(ws);
  console.log(`── ${cfg.name} ── (${rows.length} rows)`);

  let matched = 0;
  let missed = 0;

  for (const row of rows) {
    const titleRaw = row[cfg.titleCol];
    if (!titleRaw) continue;
    const titleKey = normalizeTitle(titleRaw);
    const deal = dealsByTitle.get(titleKey);
    if (!deal) {
      missed++;
      continue;
    }

    // Collect agent names from all agent columns (handle comma-separated)
    const agentNames = [];
    for (const col of cfg.agentCols) {
      const val = row[col];
      if (!val) continue;
      const parts = String(val).split(",").map((s) => s.trim()).filter(Boolean);
      agentNames.push(...parts);
    }
    if (agentNames.length === 0) continue;

    // Resolve to user IDs
    const userIds = [];
    for (const name of agentNames) {
      const user = resolveUser(name, usersMap);
      if (user && !userIds.includes(user.id)) {
        userIds.push(user.id);
      }
    }
    if (userIds.length === 0) continue;

    // Soft-delete existing assignments
    const cleared =
      await sql`UPDATE deal_agents SET removed_at = now() WHERE deal_id = ${deal.id} AND removed_at IS NULL`;

    // Insert new assignments
    for (const uid of userIds) {
      const id = randomUUID();
      await sql`INSERT INTO deal_agents (id, deal_id, user_id, assigned_at) VALUES (${id}, ${deal.id}, ${uid}, now())`;
    }

    totalCleared += cleared?.length ?? 0;
    totalInserted += userIds.length;
    matched++;
  }

  totalUpdated += matched;
  totalSkipped += missed;
  console.log(`  matched: ${matched}, no deal found: ${missed}`);
}

console.log(`\n═══ Summary ═══`);
console.log(`Deals updated: ${totalUpdated}`);
console.log(`Rows skipped (no matching deal): ${totalSkipped}`);
console.log(`Agent assignments inserted: ${totalInserted}`);
console.log("Done.");
