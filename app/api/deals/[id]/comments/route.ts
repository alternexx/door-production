import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { dealComments } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const comments = await db
    .select()
    .from(dealComments)
    .where(eq(dealComments.dealId, id))
    .orderBy(desc(dealComments.createdAt));
  return NextResponse.json(comments);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { content, authorId, authorName } = body;

    if (!content || !authorId || !authorName) {
      return NextResponse.json(
        { error: "content, authorId, and authorName are required" },
        { status: 400 }
      );
    }

    const [comment] = await db
      .insert(dealComments)
      .values({
        dealId: id,
        authorId,
        authorName,
        content,
      })
      .returning();

    return NextResponse.json(comment);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to create comment" }, { status: 500 });
  }
}
