// Import Fried Maaba Master Sheet into DOOR
const { Client } = require('pg');
const XLSX = require('xlsx');
const path = require('path');
const crypto = require('crypto');

require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const SHEET_PATH = '/Users/homefolder/.openclaw/media/inbound/Fried_Maaba_Master_Sheet---8fc4ad45-d136-423a-9263-b83b80a6ea8c.xlsx';

const client = new Client({ connectionString: process.env.DATABASE_URL });

function uuid() { return crypto.randomUUID(); }

function cleanPrice(val) {
  if (!val) return null;
  const n = Math.round(Number(String(val).replace(/[^0-9.]/g, '')));
  return isNaN(n) || n === 0 ? null : n;
}

function cleanText(val) {
  if (!val) return null;
  const s = String(val).trim();
  return s === '' || s === 'None' ? null : s;
}

// Fuzzy stage match
function matchStage(stages, dealType, stageName) {
  if (!stageName) return stages.find(s => s.deal_type === dealType) || stages[0];
  const name = String(stageName).trim().toLowerCase();
  // exact match first
  let found = stages.find(s => s.deal_type === dealType && s.name.toLowerCase() === name);
  if (found) return found;
  // partial match
  found = stages.find(s => s.deal_type === dealType && s.name.toLowerCase().includes(name));
  if (found) return found;
  // fallback: first stage of deal type
  return stages.find(s => s.deal_type === dealType);
}

// Match agent by first name (case insensitive)
function matchAgents(users, ...names) {
  const ids = [];
  for (const n of names) {
    if (!n) continue;
    // Handle comma-separated names in one cell
    const parts = String(n).split(',').map(x => x.trim()).filter(Boolean);
    for (const part of parts) {
      const lower = part.toLowerCase();
      const user = users.find(u => u.name.toLowerCase() === lower || u.name.toLowerCase().startsWith(lower + ' ') || u.name.toLowerCase().split(' ')[0] === lower);
      if (user && !ids.includes(user.id)) ids.push(user.id);
    }
  }
  return ids;
}

function isArchived(sheet) {
  return sheet.toLowerCase().includes('archive');
}

function dealTypeFromSheet(sheet) {
  const s = sheet.toLowerCase();
  if (s.includes('rental')) return 'rental';
  if (s.includes('seller')) return 'seller';
  if (s.includes('buyer')) return 'buyer';
  if (s.includes('application')) return 'application';
  if (s.includes('tenant rep')) return 'tenant_rep';
  return null;
}

async function main() {
  await client.connect();

  const stagesRes = await client.query('SELECT id, deal_type, name FROM pipeline_stages ORDER BY order_index');
  const stages = stagesRes.rows;

  const usersRes = await client.query('SELECT id, name FROM users WHERE is_active = true');
  const users = usersRes.rows;

  const markUser = users.find(u => u.name.toLowerCase().includes('mark'));

  const wb = XLSX.readFile(SHEET_PATH);

  const sheetsToImport = [
    'Rentals', 'Rental Archive',
    'Sellers', 'Sellers Archive',
    'Buyers', 'Buyers Archive',
    'Applications in Process', 'Application Archive',
    'Tenant Rep', 'Tenant Rep Archive',
  ];

  let totalDeals = 0;
  let totalAgents = 0;
  let skipped = 0;

  for (const sheetName of sheetsToImport) {
    const ws = wb.Sheets[sheetName];
    if (!ws) { console.log(`Sheet not found: ${sheetName}`); continue; }

    const rows = XLSX.utils.sheet_to_json(ws, { defval: null });
    const dealType = dealTypeFromSheet(sheetName);
    const archived = isArchived(sheetName);

    console.log(`\n=== ${sheetName} (${dealType}, archived=${archived}) — ${rows.length} rows ===`);

    for (const row of rows) {
      // Skip empty rows
      const vals = Object.values(row).filter(v => v !== null && v !== undefined && v !== '');
      if (vals.length === 0) { skipped++; continue; }

      let title, address, borough, price, notes, stageName, agentNames = [];
      let applicant = null, appLink = null, email = null, phone = null, moveInDate = null;

      if (dealType === 'rental') {
        title = cleanText(row['Property']) || 'Untitled';
        address = cleanText(row['Property']) || '';
        borough = cleanText(row['Borough']) || '';
        price = cleanPrice(row['Price']);
        notes = cleanText(row['Notes']);
        stageName = cleanText(row['Stage']);
        applicant = cleanText(row['Applicant']);
        appLink = cleanText(row['App Link']);
        agentNames = [row['Showing Agent'] || row['Showing agent'], row['Agent 2'], row['Agent 3']];
      } else if (dealType === 'seller') {
        title = cleanText(row['Property']) || 'Untitled';
        address = cleanText(row['Property']) || '';
        borough = cleanText(row['Borough']) || '';
        price = cleanPrice(row['Price']);
        notes = cleanText(row['Notes']);
        stageName = cleanText(row['Stage']);
        agentNames = [row['Agent 1'], row['Agent 2'], row['Agent 3']];
      } else if (dealType === 'buyer') {
        title = cleanText(row['Client']) || 'Untitled';
        address = cleanText(row['Client']) || '';
        borough = cleanText(row['Borough']) || '';
        price = cleanPrice(row['Budget']);
        notes = cleanText(row['Notes']);
        stageName = cleanText(row['Stage']);
        agentNames = [row['Agent 1'], row['Agent 2'], row['Agent 3']];
      } else if (dealType === 'application') {
        applicant = cleanText(row['Applicant']);
        title = applicant || 'Untitled';
        address = cleanText(row['Address']) || '';
        borough = 'Unknown';
        price = null;
        email = cleanText(row['Email']);
        phone = cleanText(row['Phone']);
        moveInDate = cleanText(row['Move-in Date']);
        notes = cleanText(row['Notes']);
        stageName = cleanText(row['Stage']);
        agentNames = [row['Agent']];
      } else if (dealType === 'tenant_rep') {
        title = cleanText(row['Client']) || 'Untitled';
        address = cleanText(row['Client']) || '';
        borough = cleanText(row['Borough']) || '';
        price = null;
        notes = cleanText(row['Notes']);
        stageName = cleanText(row['Stage']);
        agentNames = [row['Agent 1'], row['Agent 2'], row['Agent 3']];
      }

      if (!title || title === 'Untitled' && !address) { skipped++; continue; }

      const stage = matchStage(stages, dealType, stageName);
      if (!stage) { console.log(`  No stage found for ${dealType}/${stageName}`); skipped++; continue; }

      const agentIds = matchAgents(users, ...agentNames);
      const createdBy = agentIds[0] || markUser?.id;
      if (!createdBy) { skipped++; continue; }

      const dealId = uuid();
      const now = new Date();

      await client.query(`
        INSERT INTO deals (id, deal_type, title, address, borough, price, status, notes, stage_id, created_by, created_at, updated_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      `, [
        dealId, dealType, title, address, borough, price,
        archived ? 'archived' : 'active',
        notes, stage.id, createdBy, now, now
      ]);

      // Insert agents
      for (let i = 0; i < agentIds.length; i++) {
        await client.query(`
          INSERT INTO deal_agents (id, deal_id, user_id, assigned_at)
          VALUES ($1,$2,$3,$4)
        `, [uuid(), dealId, agentIds[i], now]);
        totalAgents++;
      }

      totalDeals++;
    }
  }

  await client.end();
  console.log(`\n✅ Done — ${totalDeals} deals imported, ${totalAgents} agent assignments, ${skipped} rows skipped`);
}

main().catch(e => { console.error(e); process.exit(1); });
