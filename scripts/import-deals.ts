import { neon } from "@neondatabase/serverless";
import * as XLSX from "xlsx";

const DATABASE_URL = process.env.DATABASE_URL!;
const sql = neon(DATABASE_URL);

const XLSX_PATH =
  "/Users/homefolder/.openclaw/media/inbound/Mar_17_Fried_Maaba_Master_Sheet_7---97912d3e-5b1f-4bd0-8d99-3a373d442e77.xlsx";

// Known agents to create if users table is empty
const KNOWN_AGENTS = [
  "Mark",
  "Dioris",
  "Kevin",
  "Jack",
  "James",
  "Alexandra",
  "Emmanuel",
  "Judah",
  "Mayra",
  "Sherif",
];

type DealType = "rental" | "seller" | "buyer" | "application" | "tenant_rep";

interface Stage {
  id: string;
  deal_type: DealType;
  name: string;
}

interface User {
  id: string;
  name: string;
}

// Parse price: "$2,950.00" or 2950 → number
function parsePrice(val: unknown): number | null {
  if (val === null || val === undefined || val === "") return null;
  if (typeof val === "number") return Math.round(val);
  const str = String(val).replace(/[$,]/g, "").trim();
  const num = parseFloat(str);
  return isNaN(num) ? null : Math.round(num);
}

// Clean string
function cleanStr(val: unknown): string | null {
  if (val === null || val === undefined) return null;
  const s = String(val).trim();
  return s === "" ? null : s;
}

async function ensureAgents(): Promise<Map<string, string>> {
  // Check if users exist
  const existing = await sql`SELECT id, name FROM users`;
  const agentMap = new Map<string, string>();

  if (existing.length === 0) {
    console.log("Creating agents...");
    for (const name of KNOWN_AGENTS) {
      const email = `${name.toLowerCase()}@friedmaaba.com`;
      const clerkId = `import_${name.toLowerCase()}_${Date.now()}`;
      const result = await sql`
        INSERT INTO users (clerk_id, email, name, role)
        VALUES (${clerkId}, ${email}, ${name}, 'agent')
        RETURNING id, name
      `;
      agentMap.set(name.toLowerCase(), result[0].id);
      console.log(`  Created agent: ${name}`);
    }
  } else {
    for (const u of existing) {
      agentMap.set(u.name.toLowerCase(), u.id);
    }
    console.log(`Found ${existing.length} existing users`);
  }

  return agentMap;
}

async function loadStages(): Promise<Map<string, Stage>> {
  const stages = await sql`SELECT id, deal_type, name FROM pipeline_stages`;
  const stageMap = new Map<string, Stage>();
  for (const s of stages) {
    // Key by dealType + lowercase name for case-insensitive lookup
    const key = `${s.deal_type}:${s.name.toLowerCase()}`;
    stageMap.set(key, s as Stage);
  }
  return stageMap;
}

async function getFirstStage(
  dealType: DealType,
  stageMap: Map<string, Stage>
): Promise<string> {
  // Find first stage for this deal type
  for (const [key, stage] of stageMap) {
    if (stage.deal_type === dealType) return stage.id;
  }
  throw new Error(`No stages found for deal type: ${dealType}`);
}

function findStageId(
  stageName: string | null,
  dealType: DealType,
  stageMap: Map<string, Stage>
): string | null {
  if (!stageName) return null;
  const key = `${dealType}:${stageName.toLowerCase()}`;
  const stage = stageMap.get(key);
  return stage?.id ?? null;
}

function findAgentId(
  agentName: unknown,
  agentMap: Map<string, string>
): string | null {
  if (!agentName) return null;
  const name = String(agentName).trim().toLowerCase();
  if (!name) return null;
  // Try first name match
  const firstName = name.split(" ")[0];
  return agentMap.get(firstName) ?? agentMap.get(name) ?? null;
}

async function clearDeals() {
  console.log("Clearing existing deals...");
  // Delete in order to respect FK constraints
  await sql`DELETE FROM deal_checklist_items`;
  await sql`DELETE FROM deal_stage_history`;
  await sql`DELETE FROM deal_history`;
  await sql`DELETE FROM deal_contacts`;
  await sql`DELETE FROM deal_agents`;
  await sql`DELETE FROM showings`;
  await sql`DELETE FROM tasks`;
  await sql`DELETE FROM deals`;
  console.log("  Done clearing deals");
}

async function importRentals(
  sheet: XLSX.WorkSheet,
  agentMap: Map<string, string>,
  stageMap: Map<string, Stage>,
  createdById: string
): Promise<number> {
  const data = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 });
  let count = 0;
  const defaultStageId = await getFirstStage("rental", stageMap);

  for (let i = 1; i < data.length; i++) {
    const row = data[i] as unknown[];
    const address = cleanStr(row[0]);
    if (!address) continue;

    const borough = cleanStr(row[4]) || "Unknown";
    const price = parsePrice(row[5]);
    const stageName = cleanStr(row[6]);
    const applicant = cleanStr(row[8]);
    const notes = cleanStr(row[9]);

    const stageId = findStageId(stageName, "rental", stageMap) ?? defaultStageId;
    const title = address;

    const result = await sql`
      INSERT INTO deals (deal_type, title, address, borough, price, notes, stage_id, created_by)
      VALUES ('rental', ${title}, ${address}, ${borough}, ${price}, ${notes}, ${stageId}, ${createdById})
      RETURNING id
    `;
    const dealId = result[0].id;

    // Assign agents
    const agentNames = [row[1], row[2], row[3]];
    for (const name of agentNames) {
      const agentId = findAgentId(name, agentMap);
      if (agentId) {
        await sql`
          INSERT INTO deal_agents (deal_id, user_id)
          VALUES (${dealId}, ${agentId})
        `;
      }
    }

    // Create contact if applicant exists
    if (applicant) {
      const contactResult = await sql`
        INSERT INTO contacts (full_name)
        VALUES (${applicant})
        RETURNING id
      `;
      await sql`
        INSERT INTO deal_contacts (deal_id, contact_id, role)
        VALUES (${dealId}, ${contactResult[0].id}, 'applicant')
      `;
    }

    count++;
  }

  return count;
}

async function importSellers(
  sheet: XLSX.WorkSheet,
  agentMap: Map<string, string>,
  stageMap: Map<string, Stage>,
  createdById: string
): Promise<number> {
  const data = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 });
  let count = 0;
  const defaultStageId = await getFirstStage("seller", stageMap);

  for (let i = 1; i < data.length; i++) {
    const row = data[i] as unknown[];
    const address = cleanStr(row[0]);
    if (!address) continue;

    const borough = cleanStr(row[4]) || "Unknown";
    const price = parsePrice(row[5]);
    const stageName = cleanStr(row[6]);
    const notes = cleanStr(row[7]);

    const stageId = findStageId(stageName, "seller", stageMap) ?? defaultStageId;
    const title = address;

    const result = await sql`
      INSERT INTO deals (deal_type, title, address, borough, price, notes, stage_id, created_by)
      VALUES ('seller', ${title}, ${address}, ${borough}, ${price}, ${notes}, ${stageId}, ${createdById})
      RETURNING id
    `;
    const dealId = result[0].id;

    // Assign agents
    const agentNames = [row[1], row[2], row[3]];
    for (const name of agentNames) {
      const agentId = findAgentId(name, agentMap);
      if (agentId) {
        await sql`
          INSERT INTO deal_agents (deal_id, user_id)
          VALUES (${dealId}, ${agentId})
        `;
      }
    }

    count++;
  }

  return count;
}

async function importBuyers(
  sheet: XLSX.WorkSheet,
  agentMap: Map<string, string>,
  stageMap: Map<string, Stage>,
  createdById: string
): Promise<number> {
  const data = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 });
  let count = 0;
  const defaultStageId = await getFirstStage("buyer", stageMap);

  for (let i = 1; i < data.length; i++) {
    const row = data[i] as unknown[];
    const client = cleanStr(row[0]);
    if (!client) continue;

    const borough = cleanStr(row[4]) || "Unknown";
    const budget = parsePrice(row[5]);
    const stageName = cleanStr(row[6]);
    const notes = cleanStr(row[8]);

    const stageId = findStageId(stageName, "buyer", stageMap) ?? defaultStageId;
    const title = client;

    const result = await sql`
      INSERT INTO deals (deal_type, title, address, borough, price, notes, stage_id, created_by)
      VALUES ('buyer', ${title}, ${client}, ${borough}, ${budget}, ${notes}, ${stageId}, ${createdById})
      RETURNING id
    `;
    const dealId = result[0].id;

    // Assign agents (columns 1, 2, 3 are Agent 1, Agent 2, Agent 3)
    const agentNames = [row[1], row[2], row[3]];
    for (const name of agentNames) {
      const agentId = findAgentId(name, agentMap);
      if (agentId) {
        await sql`
          INSERT INTO deal_agents (deal_id, user_id)
          VALUES (${dealId}, ${agentId})
        `;
      }
    }

    // Create contact for client
    const contactResult = await sql`
      INSERT INTO contacts (full_name)
      VALUES (${client})
      RETURNING id
    `;
    await sql`
      INSERT INTO deal_contacts (deal_id, contact_id, role)
      VALUES (${dealId}, ${contactResult[0].id}, 'client')
    `;

    count++;
  }

  return count;
}

async function importApplications(
  sheet: XLSX.WorkSheet,
  agentMap: Map<string, string>,
  stageMap: Map<string, Stage>,
  createdById: string
): Promise<number> {
  const data = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 });
  let count = 0;
  const defaultStageId = await getFirstStage("application", stageMap);

  for (let i = 1; i < data.length; i++) {
    const row = data[i] as unknown[];
    const applicant = cleanStr(row[0]);
    if (!applicant) continue;

    const address = cleanStr(row[1]) || "N/A";
    const stageName = cleanStr(row[3]);
    const email = cleanStr(row[4]);
    const phone = cleanStr(row[5]);
    const notes = cleanStr(row[7]);

    const stageId =
      findStageId(stageName, "application", stageMap) ?? defaultStageId;
    const title = applicant;

    const result = await sql`
      INSERT INTO deals (deal_type, title, address, borough, notes, stage_id, created_by)
      VALUES ('application', ${title}, ${address}, 'Unknown', ${notes}, ${stageId}, ${createdById})
      RETURNING id
    `;
    const dealId = result[0].id;

    // Assign agent (single)
    const agentId = findAgentId(row[2], agentMap);
    if (agentId) {
      await sql`
        INSERT INTO deal_agents (deal_id, user_id)
        VALUES (${dealId}, ${agentId})
      `;
    }

    // Create contact with email/phone
    const contactResult = await sql`
      INSERT INTO contacts (full_name, email, phone)
      VALUES (${applicant}, ${email}, ${phone})
      RETURNING id
    `;
    await sql`
      INSERT INTO deal_contacts (deal_id, contact_id, role)
      VALUES (${dealId}, ${contactResult[0].id}, 'applicant')
    `;

    count++;
  }

  return count;
}

async function importTenantRep(
  sheet: XLSX.WorkSheet,
  agentMap: Map<string, string>,
  stageMap: Map<string, Stage>,
  createdById: string
): Promise<number> {
  const data = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 });
  let count = 0;
  const defaultStageId = await getFirstStage("tenant_rep", stageMap);

  for (let i = 1; i < data.length; i++) {
    const row = data[i] as unknown[];
    const client = cleanStr(row[0]);
    if (!client) continue;

    const borough = cleanStr(row[4]) || "Unknown";
    const stageName = cleanStr(row[5]);
    const notes = cleanStr(row[6]);

    const stageId =
      findStageId(stageName, "tenant_rep", stageMap) ?? defaultStageId;
    const title = client;

    const result = await sql`
      INSERT INTO deals (deal_type, title, address, borough, notes, stage_id, created_by)
      VALUES ('tenant_rep', ${title}, ${client}, ${borough}, ${notes}, ${stageId}, ${createdById})
      RETURNING id
    `;
    const dealId = result[0].id;

    // Assign agents
    const agentNames = [row[1], row[2], row[3]];
    for (const name of agentNames) {
      const agentId = findAgentId(name, agentMap);
      if (agentId) {
        await sql`
          INSERT INTO deal_agents (deal_id, user_id)
          VALUES (${dealId}, ${agentId})
        `;
      }
    }

    // Create contact
    const contactResult = await sql`
      INSERT INTO contacts (full_name)
      VALUES (${client})
      RETURNING id
    `;
    await sql`
      INSERT INTO deal_contacts (deal_id, contact_id, role)
      VALUES (${dealId}, ${contactResult[0].id}, 'client')
    `;

    count++;
  }

  return count;
}

async function main() {
  console.log("=== Deal Import Script ===\n");

  // Load Excel file
  console.log("Loading Excel file...");
  const workbook = XLSX.readFile(XLSX_PATH);
  console.log(`  Sheets: ${workbook.SheetNames.join(", ")}\n`);

  // Ensure agents exist
  const agentMap = await ensureAgents();
  console.log(`  Agent map: ${agentMap.size} agents\n`);

  // Load stages
  const stageMap = await loadStages();
  console.log(`Loaded ${stageMap.size} stages\n`);

  // Get a default user for created_by (use first agent)
  const firstAgentId = agentMap.values().next().value!;

  // Clear existing deals
  await clearDeals();

  // Import each sheet type (skip archives)
  const results: Record<string, number> = {};

  if (workbook.Sheets["Rentals"]) {
    results.rentals = await importRentals(
      workbook.Sheets["Rentals"],
      agentMap,
      stageMap,
      firstAgentId
    );
    console.log(`Imported ${results.rentals} rentals`);
  }

  if (workbook.Sheets["Sellers"]) {
    results.sellers = await importSellers(
      workbook.Sheets["Sellers"],
      agentMap,
      stageMap,
      firstAgentId
    );
    console.log(`Imported ${results.sellers} sellers`);
  }

  if (workbook.Sheets["Buyers"]) {
    results.buyers = await importBuyers(
      workbook.Sheets["Buyers"],
      agentMap,
      stageMap,
      firstAgentId
    );
    console.log(`Imported ${results.buyers} buyers`);
  }

  if (workbook.Sheets["Applications in Process"]) {
    results.applications = await importApplications(
      workbook.Sheets["Applications in Process"],
      agentMap,
      stageMap,
      firstAgentId
    );
    console.log(`Imported ${results.applications} applications`);
  }

  if (workbook.Sheets["Tenant Rep"]) {
    results.tenant_rep = await importTenantRep(
      workbook.Sheets["Tenant Rep"],
      agentMap,
      stageMap,
      firstAgentId
    );
    console.log(`Imported ${results.tenant_rep} tenant rep deals`);
  }

  console.log("\n=== Import Complete ===");
  console.log(JSON.stringify(results, null, 2));

  const total = Object.values(results).reduce((a, b) => a + b, 0);
  console.log(`\nTotal deals imported: ${total}`);
}

main().catch((err) => {
  console.error("Import failed:", err);
  process.exit(1);
});
