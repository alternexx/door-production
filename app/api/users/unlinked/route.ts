import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { sql } from "drizzle-orm";

export async function GET() {
  const unlinked = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(sql`${users.clerkId} LIKE 'pending_%'`)
    .orderBy(users.name);

  return NextResponse.json(unlinked);
}
