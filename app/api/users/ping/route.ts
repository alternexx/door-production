import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST() {
  const user = await requireUser();
  await db.update(users).set({ lastActiveAt: new Date() }).where(eq(users.id, user.id));
  return NextResponse.json({ ok: true });
}
