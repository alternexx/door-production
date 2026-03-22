import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: Request) {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId } = await req.json();
  if (!userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }

  // Verify target user has pending clerk_id
  const [target] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!target || !target.clerkId.startsWith("pending_")) {
    return NextResponse.json({ error: "User not available for claiming" }, { status: 400 });
  }

  // Claim: set clerk_id to the current Clerk user
  await db
    .update(users)
    .set({ clerkId: clerkUserId, updatedAt: new Date() })
    .where(eq(users.id, userId));

  return NextResponse.json({ success: true });
}
