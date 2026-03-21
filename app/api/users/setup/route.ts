import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, or, like } from "drizzle-orm";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const unlinked = await db
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(
        or(
          like(users.clerkId, "import_%"),
          like(users.clerkId, "unlinked_%")
        )
      )
      .orderBy(users.name);

    return NextResponse.json({ agents: unlinked });
  } catch {
    return NextResponse.json({ error: "Failed to fetch agents" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { userId, name } = body as { userId?: string; name?: string };

    const client = await clerkClient();
    const clerkUser = await client.users.getUser(clerkUserId);
    const email =
      clerkUser.emailAddresses.find(
        (e) => e.id === clerkUser.primaryEmailAddressId
      )?.emailAddress ?? clerkUser.emailAddresses[0]?.emailAddress;

    if (!email) {
      return NextResponse.json({ error: "No email found" }, { status: 400 });
    }

    if (userId) {
      // Link existing placeholder agent
      const [agent] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!agent) {
        return NextResponse.json({ error: "Agent not found" }, { status: 404 });
      }

      if (!agent.clerkId.startsWith("import_") && !agent.clerkId.startsWith("unlinked_")) {
        return NextResponse.json({ error: "Agent already linked" }, { status: 400 });
      }

      await db
        .update(users)
        .set({ clerkId: clerkUserId, email, isActive: true })
        .where(eq(users.id, userId));

      return NextResponse.json({ ok: true });
    }

    if (name && typeof name === "string" && name.trim().length > 0) {
      // Create new agent row
      await db.insert(users).values({
        clerkId: clerkUserId,
        email,
        name: name.trim(),
        role: "agent",
        isActive: true,
      });

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "userId or name is required" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Failed to set up user" }, { status: 500 });
  }
}
