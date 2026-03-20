import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tasks, taskHistory, dealHistory, deals, users } from "@/db/schema";
import { and, eq } from "drizzle-orm";

const PRIORITIES = ["low", "medium", "high", "urgent"] as const;
const STATUSES = ["todo", "in_progress", "completed"] as const;

type TaskPriority = (typeof PRIORITIES)[number];
type TaskStatus = (typeof STATUSES)[number];

function normalizePriority(value: unknown): TaskPriority {
  if (value === "normal") return "medium";
  if (typeof value === "string" && PRIORITIES.includes(value as TaskPriority)) {
    return value as TaskPriority;
  }
  return "medium";
}

function normalizeStatus(value: unknown): TaskStatus {
  if (value === "pending") return "todo";
  if (typeof value === "string" && STATUSES.includes(value as TaskStatus)) {
    return value as TaskStatus;
  }
  return "todo";
}

function normalizeTaskRow<T extends { status: string; priority: string }>(row: T): T {
  return {
    ...row,
    status: normalizeStatus(row.status),
    priority: normalizePriority(row.priority),
  };
}

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

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getRequestUser();
    if (!currentUser) {
      return NextResponse.json({ error: "No user found" }, { status: 404 });
    }

    const { id } = await params;
    const body = await req.json();

    const [existing] = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, id))
      .limit(1);
    if (!existing) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const [deal] = await db
      .select()
      .from(deals)
      .where(eq(deals.id, existing.dealId))
      .limit(1);

    const now = new Date();
    const updateData: Record<string, unknown> = { updatedAt: now };
    const changes: string[] = [];

    if (body.title !== undefined && body.title !== existing.title) {
      updateData.title = body.title;
      changes.push(`title: ${existing.title} → ${body.title}`);
    }
    if (
      body.description !== undefined &&
      body.description !== existing.description
    ) {
      updateData.description = body.description;
      changes.push("description");
    }
    if (body.priority !== undefined) {
      const nextPriority = normalizePriority(body.priority);
      if (nextPriority !== existing.priority) {
        updateData.priority = nextPriority;
        changes.push(`priority: ${existing.priority} → ${nextPriority}`);
      }
    }
    if (body.status !== undefined) {
      const nextStatus = normalizeStatus(body.status);
      if (nextStatus !== normalizeStatus(existing.status)) {
        updateData.status = nextStatus;
        changes.push(`status: ${normalizeStatus(existing.status)} → ${nextStatus}`);
        if (nextStatus === "completed") {
          updateData.completedAt = now;
          updateData.completedBy = currentUser.id;
        } else {
          updateData.completedAt = null;
          updateData.completedBy = null;
        }
      }
    }
    if (body.dueDate !== undefined) {
      const newDue = body.dueDate ? new Date(body.dueDate) : null;
      const existingDueIso = existing.dueDate?.toISOString() ?? null;
      const newDueIso = newDue?.toISOString() ?? null;
      if (existingDueIso !== newDueIso) {
        updateData.dueDate = newDue;
        changes.push("due date");

        const action =
          existing.dueDate && newDue ? "rescheduled" : ("updated" as const);
        await db.insert(taskHistory).values({
          taskId: id,
          action,
          oldValue: existing.dueDate?.toISOString() ?? null,
          newValue: newDue?.toISOString() ?? null,
          changedBy: currentUser.id,
        });
      }
    }
    if (
      body.assignedTo !== undefined &&
      body.assignedTo !== existing.assignedTo
    ) {
      updateData.assignedTo = body.assignedTo;
      changes.push("assignee");
      await db.insert(taskHistory).values({
        taskId: id,
        action: "reassigned",
        oldValue: existing.assignedTo,
        newValue: body.assignedTo,
        changedBy: currentUser.id,
      });
    }

    if (changes.length > 0) {
      await db.insert(taskHistory).values({
        taskId: id,
        action: "updated",
        oldValue: null,
        newValue: changes.join("; "),
        changedBy: currentUser.id,
      });
    }

    await db.update(tasks).set(updateData).where(eq(tasks.id, id));

    if (deal && changes.length > 0) {
      await db.insert(dealHistory).values({
        dealId: deal.id,
        dealType: deal.dealType,
        field: "task",
        oldValue: null,
        newValue: `Updated task \"${existing.title}\": ${changes.join("; ")}`,
        changedById: currentUser.id,
        changedByName: currentUser.name,
      });
    }

    const full = await db.query.tasks.findFirst({
      where: eq(tasks.id, id),
      with: { assignee: true, deal: true },
    });

    return NextResponse.json(full ? normalizeTaskRow(full) : null);
  } catch (e: unknown) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to update task" },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    const [deal] = await db
      .select()
      .from(deals)
      .where(eq(deals.id, existing.dealId))
      .limit(1);

    await db.delete(taskHistory).where(eq(taskHistory.taskId, id));
    await db.delete(tasks).where(eq(tasks.id, id));

    if (deal) {
      await db.insert(dealHistory).values({
        dealId: deal.id,
        dealType: deal.dealType,
        field: "task",
        oldValue: null,
        newValue: `Deleted task: ${existing.title}`,
        changedById: currentUser.id,
        changedByName: currentUser.name,
      });
    }

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to delete task" },
      { status: 500 }
    );
  }
}
