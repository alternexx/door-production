import { db } from "@/db";
import { users, type User } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export async function getRequestUser(): Promise<User | undefined> {
  const [admin] = await db
    .select()
    .from(users)
    .where(and(eq(users.role, "admin"), eq(users.isActive, true)))
    .limit(1);

  if (admin) return admin;

  const [activeUser] = await db
    .select()
    .from(users)
    .where(eq(users.isActive, true))
    .limit(1);

  return activeUser;
}

export async function requireRequestUser() {
  const user = await getRequestUser();
  if (!user) {
    throw new Error("No user found");
  }
  return user;
}

export async function requireAdminUser() {
  const user = await requireRequestUser();
  if (user.role !== "admin") {
    throw new Error("Admin access required");
  }
  return user;
}
