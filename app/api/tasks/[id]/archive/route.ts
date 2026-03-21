import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tasks, taskHistory, dealHistory, deals, users } from "@/db/schema";
import { and, eq } from "drizzle-orm";

async function getRequestUser() {
  const [admin] = await db.select().from(users).where(and(eq(users.role, "admin"), eq(users.isActive, true))).limit(1);
  if (admin) return admin;
  const [active] = await db.select().from(users).where(eq(users.isActive, true)).limit(1);
  return active;
}

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const currentUser = await getRequestUser();
  if (!currentUser) return NextResponse.json({ error: "No user" }, { status: 404 });

  const { id } = await params;
  const [existing] = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [deal] = await db.select().from(deals).where(eq(deals.id, existing.dealId)).limit(1);

  await db.update(tasks).set({ status: "completed", completedAt: new Date(), completedBy: currentUser.id, updatedAt: new Date() }).where(eq(tasks.id, id));

  await db.insert(taskHistory).values({ taskId: id, action: "cancelled", oldValue: existing.status, newValue: "archived", changedBy: currentUser.id });

  if (deal) {
    await db.insert(dealHistory).values({ dealId: deal.id, dealType: deal.dealType, field: "task", oldValue: null, newValue: `Archived task: ${existing.title}`, changedById: currentUser.id, changedByName: currentUser.name });
  }

  return NextResponse.json({ success: true });
}
