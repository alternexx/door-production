import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tasks, taskHistory, dealHistory, deals } from "@/db/schema";
import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";

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

export async function GET(req: NextRequest) {
  try {
    const dealId = req.nextUrl.searchParams.get("deal_id");
    const assignedTo = req.nextUrl.searchParams.get("assigned_to");
    const onlyOpen = req.nextUrl.searchParams.get("open_only") === "true";

    const whereClauses = [];

    if (dealId) {
      whereClauses.push(eq(tasks.dealId, dealId));
    }

    if (assignedTo === "me") {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      whereClauses.push(eq(tasks.assignedTo, currentUser.id));
    } else if (assignedTo) {
      whereClauses.push(eq(tasks.assignedTo, assignedTo));
    }

    if (onlyOpen) {
      whereClauses.push(inArray(tasks.status, ["todo", "in_progress"]));
    }

    const rows = await db.query.tasks.findMany({
      where: whereClauses.length > 0 ? and(...whereClauses) : undefined,
      with: {
        assignee: true,
        deal: true,
      },
      orderBy: [
        asc(isNull(tasks.dueDate)),
        asc(tasks.dueDate),
        asc(tasks.createdAt),
      ],
    });

    return NextResponse.json(rows.map(normalizeTaskRow));
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to fetch tasks" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    const [deal] = await db
      .select()
      .from(deals)
      .where(eq(deals.id, body.dealId))
      .limit(1);
    if (!deal) {
      return NextResponse.json({ error: "Deal not found" }, { status: 404 });
    }

    const [newTask] = await db
      .insert(tasks)
      .values({
        dealId: body.dealId,
        title: body.title,
        description: body.description,
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        assignedTo: body.assignedTo ?? null,
        priority: normalizePriority(body.priority),
        status: normalizeStatus(body.status),
        createdBy: currentUser.id,
      })
      .returning();

    await db.insert(taskHistory).values({
      taskId: newTask.id,
      action: "created",
      newValue: JSON.stringify({
        title: newTask.title,
        priority: newTask.priority,
        status: newTask.status,
      }),
      changedBy: currentUser.id,
    });

    await db.insert(dealHistory).values({
      dealId: body.dealId,
      dealType: deal.dealType,
      field: "task",
      oldValue: null,
      newValue: `Created task: ${newTask.title}`,
      changedById: currentUser.id,
      changedByName: currentUser.name,
    });

    const full = await db.query.tasks.findFirst({
      where: eq(tasks.id, newTask.id),
      with: { assignee: true, deal: true },
    });

    return NextResponse.json(full ? normalizeTaskRow(full) : null, { status: 201 });
  } catch (e: unknown) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to create task" },
      { status: 500 }
    );
  }
}
