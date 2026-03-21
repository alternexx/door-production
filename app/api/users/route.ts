import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { ilike } from "drizzle-orm";

export async function GET() {
  const teamMembers = await db.select().from(users);
  return NextResponse.json(teamMembers);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, email, role } = body as {
    name: string;
    email: string;
    role: "admin" | "agent";
  };

  if (!name || !email || !role) {
    return NextResponse.json({ error: "name, email, and role are required" }, { status: 400 });
  }

  // Check if already exists
  const [existing] = await db.select().from(users).where(ilike(users.email, email)).limit(1);
  if (existing) {
    return NextResponse.json({ error: "A user with this email already exists" }, { status: 409 });
  }

  // Create pending DB record
  const clerkId = `invite_pending_${Date.now()}`;
  const [newUser] = await db.insert(users).values({
    clerkId,
    name,
    email,
    role,
    isActive: false, // activated when they accept the invite and sign up
  }).returning();

  // Send Clerk invitation email (if configured)
  const clerkSecretKey = process.env.CLERK_SECRET_KEY;
  if (clerkSecretKey && !clerkSecretKey.startsWith("test_")) {
    try {
      const inviteRes = await fetch("https://api.clerk.com/v1/invitations", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${clerkSecretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email_address: email,
          redirect_url: `${process.env.NEXT_PUBLIC_APP_URL || "https://door-v3-production.up.railway.app"}/sign-in`,
          public_metadata: { role, invited_name: name },
          notify: true,
          ignore_existing: false,
        }),
      });
      if (!inviteRes.ok) {
        const err = await inviteRes.json();
        console.error("Clerk invite error:", err);
      }
    } catch (e) {
      console.error("Failed to send Clerk invite:", e);
    }
  }

  return NextResponse.json(newUser, { status: 201 });
}
