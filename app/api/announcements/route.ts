import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { announcementReads, announcements } from "@/db/schema";
import { and, desc, eq, inArray } from "drizzle-orm";
import { requireAdminUser, requireRequestUser } from "@/lib/request-user";

function toBoolean(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

export async function GET(req: NextRequest) {
  try {
    const currentUser = await requireRequestUser();
    const limitParam = Number(req.nextUrl.searchParams.get("limit") ?? "10");
    const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 50) : 10;

    const rows = await db.query.announcements.findMany({
      with: { creator: true },
      orderBy: [desc(announcements.createdAt)],
    });

    const announcementIds = rows.map((row) => row.id);

    const readRows =
      announcementIds.length > 0
        ? await db
            .select()
            .from(announcementReads)
            .where(
              and(
                eq(announcementReads.userId, currentUser.id),
                inArray(announcementReads.announcementId, announcementIds)
              )
            )
        : [];

    const readMap = new Map(readRows.map((row) => [row.announcementId, row.readAt]));

    const normalized = rows
      .map((row) => {
        const readAt = readMap.get(row.id) ?? null;
        return {
          ...row,
          isRead: Boolean(readAt),
          readAt,
        };
      })
      .sort((a, b) => {
        if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

    const unreadCount = normalized.filter((item) => !item.isRead).length;

    return NextResponse.json({
      announcements: normalized.slice(0, limit),
      unreadCount,
      currentUser: {
        id: currentUser.id,
        name: currentUser.name,
        role: currentUser.role,
        isAdmin: currentUser.role === "admin",
      },
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "No user found") {
      return NextResponse.json({ error: "No user found" }, { status: 404 });
    }
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch announcements" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const currentUser = await requireAdminUser();

    const body = await req.json();
    const title = typeof body?.title === "string" ? body.title.trim() : "";
    const content = typeof body?.content === "string" ? body.content.trim() : "";

    if (!title || !content) {
      return NextResponse.json({ error: "Title and content are required" }, { status: 400 });
    }

    const [created] = await db
      .insert(announcements)
      .values({
        title,
        content,
        isPinned: toBoolean(body?.isPinned, false),
        createdBy: currentUser.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return NextResponse.json(
      {
        ...created,
        creator: {
          id: currentUser.id,
          name: currentUser.name,
          role: currentUser.role,
        },
        isRead: false,
        readAt: null,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "No user found") {
      return NextResponse.json({ error: "No user found" }, { status: 404 });
    }
    if (error instanceof Error && error.message === "Admin access required") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    console.error(error);
    return NextResponse.json({ error: "Failed to create announcement" }, { status: 500 });
  }
}
