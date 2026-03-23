import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, ilike } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const secret = process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  // Verify signature
  const payload = await req.text();
  const headers = {
    "svix-id": req.headers.get("svix-id") ?? "",
    "svix-timestamp": req.headers.get("svix-timestamp") ?? "",
    "svix-signature": req.headers.get("svix-signature") ?? "",
  };

  let body: { type: string; data: Record<string, unknown> };
  try {
    const wh = new Webhook(secret);
    body = wh.verify(payload, headers) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const { type, data } = body;

  if (type !== "user.created") {
    return NextResponse.json({ ok: true });
  }

  const clerkId = data.id as string;
  const emailAddresses = data.email_addresses as Array<{ email_address: string }>;
  const email = emailAddresses?.[0]?.email_address ?? "";
  const firstName = (data.first_name as string) ?? "";
  const lastName = (data.last_name as string) ?? "";
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

  // Not pre-invited — do nothing (who-are-you page handles manual claim)
  return NextResponse.json({ ok: true, linked: false });
}
