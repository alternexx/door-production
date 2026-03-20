import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tasks, taskHistory, dealHistory, deals, users } from "@/db/schema";
import { and, eq } from "drizzle-orm";

async function getRequestUser() {
  const [admin] = await db
    .select()
    .from(users)
    .where(and(eq(users.role, "admin"), eq(users.isActive, true)))
    .limit(1);

  if (admin) return admin;

  const [activeUser] = await db
    .select()
    .from(users)
    .where(eq(users.isActive, true))
    .limit(1);

  return activeUser;
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getRequestUser();
    if (!currentUser) {
      return NextResponse.json({ error: "No user found" }, { status: 404 });
    }

    const { id } = await params;

    const [existing] = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, id))
      .limit(1);
    if (!existing) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }
    if (existing.status !== "completed") {
      return NextResponse.json(
        { error: "Task is already open" },
        { status: 400 }
      );
    }

    const [deal] = await db
      .select()
      .from(deals)
      .where(eq(deals.id, existing.dealId))
      .limit(1);

    await db
      .update(tasks)
      .set({
        status: "todo",
        completedAt: null,
        completedBy: null,
        updatedAt: new Date(),
      })
      .where(eq(tasks.id, id));

    await db.insert(taskHistory).values({
      taskId: id,
      action: "reopened",
      oldValue: existing.status,
      newValue: "todo",
      changedBy: currentUser.id,
    });

    if (deal) {
      await db.insert(dealHistory).values({
        dealId: deal.id,
        dealType: deal.dealType,
        field: "task",
        oldValue: null,
        newValue: `Reopened task: ${existing.title}`,
        changedById: currentUser.id,
        changedByName: currentUser.name,
      });
    }

    const full = await db.query.tasks.findFirst({
      where: eq(tasks.id, id),
      with: { assignee: true, deal: true },
    });

    return NextResponse.json(
      full
        ? {
            ...full,
            status: full.status,
            priority: full.priority,
          }
        : null
    );
  } catch (e: unknown) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to reopen task" },
      { status: 500 }
    );
  }
}
