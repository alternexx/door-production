import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, ilike } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { type, data } = body;

  if (type !== "user.created") {
    return NextResponse.json({ ok: true });
  }

  const clerkId: string = data.id;
  const email: string = data.email_addresses?.[0]?.email_address ?? "";
  const firstName: string = data.first_name ?? "";
  const lastName: string = data.last_name ?? "";
  const fullName = [firstName, lastName].filter(Boolean).join(" ") || email.split("@")[0];

  if (!email || !clerkId) {
    return NextResponse.json({ error: "Missing data" }, { status: 400 });
  }

  // Check if pre-invited by email
  const [existing] = await db
    .select()
    .from(users)
    .where(ilike(users.email, email))
    .limit(1);

  if (existing) {
    // Link real Clerk ID to pre-invited user
    await db
      .update(users)
      .set({ clerkId, name: existing.name || fullName, updatedAt: new Date() })
      .where(eq(users.id, existing.id));
    return NextResponse.json({ ok: true, linked: true });
  }

  // Not pre-invited — do nothing (requireUser() will reject them)
  return NextResponse.json({ ok: true, linked: false });
}
