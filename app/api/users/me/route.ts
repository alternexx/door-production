import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

// Internal-only endpoint called by middleware to check if a Clerk user exists in our DB
export async function GET(req: NextRequest) {
  // Only allow internal calls from middleware
  if (req.headers.get("x-internal") !== "1") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const clerkId = req.nextUrl.searchParams.get("clerkId");
  if (!clerkId) return NextResponse.json({ error: "Missing clerkId" }, { status: 400 });

  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.clerkId, clerkId))
    .limit(1);

  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ ok: true });
}
