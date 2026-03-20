import { db } from "../db";
import { sql } from "drizzle-orm";

type HistoryColumnRow = { column_name: string; data_type: string };
type JsonRow = Record<string, unknown>;

async function checkHistory() {
  // Check deal_history table structure
  const cols = await db.execute<HistoryColumnRow>(sql`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'deal_history' ORDER BY ordinal_position`);
  console.log("deal_history columns:", cols.rows.map((c) => c.column_name).join(", "));
  
  // Check recent history entries
  const history = await db.execute<JsonRow>(sql`SELECT * FROM deal_history ORDER BY changed_at DESC LIMIT 5`);
  console.log("\nRecent deal_history entries:", history.rows.length);
  history.rows.forEach((h) => console.log(JSON.stringify(h)));
  
  // Check deal_stage_history
  const stageHistory = await db.execute<JsonRow>(sql`SELECT * FROM deal_stage_history ORDER BY changed_at DESC LIMIT 5`);
  console.log("\nRecent deal_stage_history entries:", stageHistory.rows.length);
  stageHistory.rows.forEach((h) => console.log(JSON.stringify(h)));
  
  // Check comments
  const comments = await db.execute<JsonRow>(sql`SELECT * FROM deal_comments ORDER BY created_at DESC LIMIT 5`);
  console.log("\nRecent deal_comments:", comments.rows.length);
  comments.rows.forEach((c) => console.log(JSON.stringify(c)));
  
  process.exit(0);
}
checkHistory();
