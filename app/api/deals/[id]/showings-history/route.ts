import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { showings, showingHistory, users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const rows = await db.query.showings.findMany({
      where: eq(showings.dealId, id),
      with: {
        agent: true,
        history: {
          orderBy: (h, { asc }) => [asc(h.changedAt)],
        },
      },
      orderBy: (s, { desc }) => [desc(s.scheduledAt)],
    });

    // Collect all changedBy user IDs to resolve names
    const userIds = new Set<string>();
    for (const row of rows) {
      for (const h of row.history) {
        userIds.add(h.changedBy);
      }
    }

    const userMap = new Map<string, string>();
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
      scheduledAt: row.scheduledAt,
      status: row.status,
      agent: row.agent ? { name: row.agent.name } : null,
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
      { error: "Failed to fetch showings history" },
      { status: 500 }
    );
  }
}
