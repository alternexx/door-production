import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";

export async function GET() {
  // Auth disabled for now — Clerk not configured

  const teamMembers = await db.select().from(users);

  return NextResponse.json(teamMembers);
}

export async function POST(request: NextRequest) {
  // Auth disabled for now — Clerk not configured

  const body = await request.json();
  const { name, email, role } = body as {
    name: string;
    email: string;
    role: "admin" | "agent";
  };

  if (!name || !email || !role) {
    return NextResponse.json(
      { error: "name, email, and role are required" },
      { status: 400 }
    );
  }

  const clerkId = `import_${name.toLowerCase().replace(/\s+/g, "_")}_${Date.now()}`;

  const [newUser] = await db
    .insert(users)
    .values({ clerkId, name, email, role })
    .returning();

  return NextResponse.json(newUser, { status: 201 });
}
