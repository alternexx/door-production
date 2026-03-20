import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { announcementReads, announcements } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { requireRequestUser } from "@/lib/request-user";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await requireRequestUser();
    const { id } = await params;

    const [existingAnnouncement] = await db
      .select()
      .from(announcements)
      .where(eq(announcements.id, id))
      .limit(1);

    if (!existingAnnouncement) {
      return NextResponse.json({ error: "Announcement not found" }, { status: 404 });
    }

    const [existingRead] = await db
      .select()
      .from(announcementReads)
      .where(
        and(
          eq(announcementReads.announcementId, id),
          eq(announcementReads.userId, currentUser.id)
        )
      )
      .limit(1);

    const now = new Date();

    if (existingRead) {
      await db
        .update(announcementReads)
        .set({ readAt: now })
        .where(eq(announcementReads.id, existingRead.id));
    } else {
      await db.insert(announcementReads).values({
        announcementId: id,
        userId: currentUser.id,
        readAt: now,
      });
    }

    return NextResponse.json({ success: true, readAt: now.toISOString() });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "No user found") {
      return NextResponse.json({ error: "No user found" }, { status: 404 });
    }
    console.error(error);
    return NextResponse.json({ error: "Failed to mark announcement as read" }, { status: 500 });
  }
}
