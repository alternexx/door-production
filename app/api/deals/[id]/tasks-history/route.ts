import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tasks } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const rows = await db.query.tasks.findMany({
      where: eq(tasks.dealId, id),
      with: {
        assignee: true,
        creator: true,
        history: {
          orderBy: (h, { asc }) => [asc(h.changedAt)],
        },
      },
      orderBy: (t, { asc }) => [asc(t.createdAt)],
    });

    // Collect changedBy user IDs to resolve names
    const userMap = new Map<string, string>();
    const userIds = new Set<string>();
    for (const row of rows) {
      for (const h of row.history) {
        userIds.add(h.changedBy);
      }
    }
    if (userIds.size > 0) {
      const userRows = await db.query.users.findMany({
        columns: { id: true, name: true },
      });
      for (const u of userRows) {
        userMap.set(u.id, u.name);
      }
    }

    const result = rows.map((row) => ({
      id: row.id,
      title: row.title,
      status: row.status,
      priority: row.priority,
      dueDate: row.dueDate,
      completedAt: row.completedAt,
      createdAt: row.createdAt,
      creator: row.creator ? { id: row.creator.id, name: row.creator.name } : null,
      assignee: row.assignee ? { id: row.assignee.id, name: row.assignee.name } : null,
      history: row.history.map((h) => ({
        action: h.action,
        changedBy: userMap.get(h.changedBy) ?? "System",
        changedAt: h.changedAt,
      })),
    }));

    return NextResponse.json(result);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to fetch tasks history" },
      { status: 500 }
    );
  }
}
