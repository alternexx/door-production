import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function getCurrentUser() {
  // In local dev, bypass Clerk and return the first admin user
  if (process.env.NODE_ENV === "development") {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.role, "admin"))
      .limit(1);
    return user ?? null;
  }

  const { userId } = await auth();
  if (!userId) return null;

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.clerkId, userId))
    .limit(1);

  return user ?? null;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }
  return user;
}
