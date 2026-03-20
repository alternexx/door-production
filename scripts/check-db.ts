import { db } from "../db";
import { sql } from "drizzle-orm";

type TableRow = { tablename: string };

async function checkTables() {
  const tables = await db.execute<TableRow>(sql`SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`);
  console.log("Tables:", tables.rows.map((t) => t.tablename).join(", "));
  const hasDealComments = tables.rows.some((t) => t.tablename === "deal_comments");
  console.log("deal_comments exists:", hasDealComments);
  process.exit(0);
}
checkTables();
