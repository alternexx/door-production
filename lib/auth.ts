import { auth, clerkClient } from "@clerk/nextjs/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

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

  let userId: string | null = null;
  try {
    const authResult = await auth();
    userId = authResult.userId;
  } catch {
    return null;
  }
  if (!userId) return null;

  // Try by clerkId first
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.clerkId, userId))
    .limit(1);

  if (user) return user;

  // Fallback: find by email and link the clerkId
  const client = await clerkClient();
  const clerkUser = await client.users.getUser(userId);
  const email =
    clerkUser.emailAddresses.find(
      (e) => e.id === clerkUser.primaryEmailAddressId
    )?.emailAddress ?? clerkUser.emailAddresses[0]?.emailAddress;

  if (email) {
    const [emailUser] = await db
      .select()
      .from(users)
      .where(sql`lower(${users.email}) = lower(${email})`)
      .limit(1);

    if (emailUser) {
      await db
        .update(users)
        .set({ clerkId: userId })
        .where(eq(users.id, emailUser.id));
      return { ...emailUser, clerkId: userId };
    }
  }

  return null;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }
  return user;
}
