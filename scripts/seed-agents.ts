import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { db } from "../db/index";
import { users } from "../db/schema";
import { sql } from "drizzle-orm";

const agents = [
  { name: "Alexandra", email: "alexandra@hhnyc.com" },
  { name: "Dioris", email: "dioris@hhnyc.com" },
  { name: "Emmanuel", email: "emmanuel@hhnyc.com" },
  { name: "Jack", email: "jack@hhnyc.com" },
  { name: "James", email: "jmaaba@hhnyc.com" },
  { name: "Judah", email: "judah@hhnyc.com" },
  { name: "Kevin", email: "kevin@hhnyc.com" },
  { name: "Mayra", email: "mayra@hhnyc.com" },
  { name: "Sherif", email: "sherif@hhnyc.com" },
];

async function main() {
  for (const agent of agents) {
    // Check if email already exists
    const [existing] = await db
      .select()
      .from(users)
      .where(sql`lower(${users.email}) = lower(${agent.email})`)
      .limit(1);

    if (existing) {
      console.log(`SKIP: ${agent.name} (${agent.email}) — already exists`);
      continue;
    }

    const clerkId = `pending_${agent.name.toLowerCase()}`;

    await db.insert(users).values({
      id: crypto.randomUUID(),
      clerkId,
      email: agent.email,
      name: agent.name,
      role: "agent",
      isActive: true,
    });

    console.log(`INSERTED: ${agent.name} (${agent.email}) — clerk_id: ${clerkId}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
