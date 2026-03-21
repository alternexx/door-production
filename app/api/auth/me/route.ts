import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ unauthorized: true });
    }

    const [user] = await db.select().from(users).where(eq(users.clerkId, userId)).limit(1);

    if (!user) {
      return NextResponse.json({ blocked: true });
    }

    if (!user.isActive) {
      return NextResponse.json({ blocked: true });
    }

    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    });
  } catch {
    return NextResponse.json({ unauthorized: true });
  }
}
