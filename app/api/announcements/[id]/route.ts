import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { announcementReads, announcements } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAdminUser } from "@/lib/request-user";

function isDefined<T>(value: T | undefined): value is T {
  return value !== undefined;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
  ) {
  try {
    await requireAdminUser();

    const { id } = await params;
    const body = await req.json();

    const [existing] = await db
      .select()
      .from(announcements)
      .where(eq(announcements.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Announcement not found" }, { status: 404 });
    }

    const title =
      body?.title !== undefined && typeof body.title === "string"
        ? body.title.trim()
        : undefined;
    const content =
      body?.content !== undefined && typeof body.content === "string"
        ? body.content.trim()
        : undefined;
    const isPinned = typeof body?.isPinned === "boolean" ? body.isPinned : undefined;

    if (body?.title !== undefined && !title) {
      return NextResponse.json({ error: "Title cannot be empty" }, { status: 400 });
    }
    if (body?.content !== undefined && !content) {
      return NextResponse.json({ error: "Content cannot be empty" }, { status: 400 });
    }

    const updateData = {
      ...(isDefined(title) ? { title } : {}),
      ...(isDefined(content) ? { content } : {}),
      ...(isDefined(isPinned) ? { isPinned } : {}),
      updatedAt: new Date(),
    };

    const [updated] = await db
      .update(announcements)
      .set(updateData)
      .where(eq(announcements.id, id))
      .returning();

    return NextResponse.json(updated);
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "No user found") {
      return NextResponse.json({ error: "No user found" }, { status: 404 });
    }
    if (error instanceof Error && error.message === "Admin access required") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    console.error(error);
    return NextResponse.json({ error: "Failed to update announcement" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminUser();

    const { id } = await params;

    const [existing] = await db
      .select()
      .from(announcements)
      .where(eq(announcements.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Announcement not found" }, { status: 404 });
    }

    await db.delete(announcementReads).where(eq(announcementReads.announcementId, id));
    await db.delete(announcements).where(eq(announcements.id, id));

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "No user found") {
      return NextResponse.json({ error: "No user found" }, { status: 404 });
    }
    if (error instanceof Error && error.message === "Admin access required") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    console.error(error);
    return NextResponse.json({ error: "Failed to delete announcement" }, { status: 500 });
  }
}
