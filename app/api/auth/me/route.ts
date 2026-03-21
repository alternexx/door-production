import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (user === null && process.env.NODE_ENV !== "development") {
      // Signed in via Clerk but no DB row — need to check if they have a Clerk session
      const { auth } = await import("@clerk/nextjs/server");
      const { userId } = await auth();

      if (!userId) {
        return NextResponse.json({ unauthorized: true });
      }

      return NextResponse.json({ needsSetup: true });
    }

    if (!user) {
      return NextResponse.json({ unauthorized: true });
    }

    if (!user.isActive) {
      return NextResponse.json({ needsSetup: true });
    }

    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    });
  } catch {
    return NextResponse.json({ unauthorized: true });
  }
}
