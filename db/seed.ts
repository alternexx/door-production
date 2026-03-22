import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL!);

// Seed agents
const AGENTS = [
  { id: "00000000-0000-0000-0000-000000000001", clerkId: "clerk-1", email: "sarah@door.com", name: "Sarah Chen", role: "admin" },
  { id: "00000000-0000-0000-0000-000000000002", clerkId: "clerk-2", email: "mike@door.com", name: "Mike Rodriguez", role: "agent" },
  { id: "00000000-0000-0000-0000-000000000003", clerkId: "clerk-3", email: "jessica@door.com", name: "Jessica Park", role: "agent" },
  { id: "00000000-0000-0000-0000-000000000004", clerkId: "clerk-4", email: "david@door.com", name: "David Kim", role: "agent" },
  { id: "00000000-0000-0000-0000-000000000005", clerkId: "clerk-5", email: "amanda@door.com", name: "Amanda Torres", role: "agent" },
];

// Stage definitions
interface StageDef {
  dealType: string;
  name: string;
  color: string;
  orderIndex: number;
  isClosedWon: boolean;
  isClosedLost: boolean;
}

const STAGE_DEFS: StageDef[] = [
  // rental
  { dealType: "rental", name: "Not Started", color: "#6b7280", orderIndex: 0, isClosedWon: false, isClosedLost: false },
  { dealType: "rental", name: "Active", color: "#2563eb", orderIndex: 1, isClosedWon: false, isClosedLost: false },
  { dealType: "rental", name: "Showing Scheduled", color: "#d97706", orderIndex: 2, isClosedWon: false, isClosedLost: false },
  { dealType: "rental", name: "Under Contract", color: "#7c3aed", orderIndex: 3, isClosedWon: false, isClosedLost: false },
  { dealType: "rental", name: "Rented", color: "#059669", orderIndex: 4, isClosedWon: true, isClosedLost: false },
  { dealType: "rental", name: "Tenant Backed Out", color: "#dc2626", orderIndex: 5, isClosedWon: false, isClosedLost: true },
  { dealType: "rental", name: "Owner Backed Out", color: "#be123c", orderIndex: 6, isClosedWon: false, isClosedLost: true },
  // seller
  { dealType: "seller", name: "Not Started", color: "#6b7280", orderIndex: 0, isClosedWon: false, isClosedLost: false },
  { dealType: "seller", name: "Active", color: "#2563eb", orderIndex: 1, isClosedWon: false, isClosedLost: false },
  { dealType: "seller", name: "Showing Scheduled", color: "#d97706", orderIndex: 2, isClosedWon: false, isClosedLost: false },
  { dealType: "seller", name: "Under Contract", color: "#7c3aed", orderIndex: 3, isClosedWon: false, isClosedLost: false },
  { dealType: "seller", name: "Sold", color: "#059669", orderIndex: 4, isClosedWon: true, isClosedLost: false },
  { dealType: "seller", name: "Listing Withdrawn", color: "#dc2626", orderIndex: 5, isClosedWon: false, isClosedLost: true },
  { dealType: "seller", name: "Listing Expired", color: "#be123c", orderIndex: 6, isClosedWon: false, isClosedLost: true },
  // buyer
  { dealType: "buyer", name: "Not Started", color: "#6b7280", orderIndex: 0, isClosedWon: false, isClosedLost: false },
  { dealType: "buyer", name: "Active", color: "#2563eb", orderIndex: 1, isClosedWon: false, isClosedLost: false },
  { dealType: "buyer", name: "Showing Scheduled", color: "#d97706", orderIndex: 2, isClosedWon: false, isClosedLost: false },
  { dealType: "buyer", name: "Under Contract", color: "#7c3aed", orderIndex: 3, isClosedWon: false, isClosedLost: false },
  { dealType: "buyer", name: "Purchased", color: "#059669", orderIndex: 4, isClosedWon: true, isClosedLost: false },
  { dealType: "buyer", name: "Buyer Backed Out", color: "#dc2626", orderIndex: 5, isClosedWon: false, isClosedLost: true },
  // application
  { dealType: "application", name: "Docs Requested", color: "#6b7280", orderIndex: 0, isClosedWon: false, isClosedLost: false },
  { dealType: "application", name: "Docs Received", color: "#2563eb", orderIndex: 1, isClosedWon: false, isClosedLost: false },
  { dealType: "application", name: "Submitted to Landlord", color: "#d97706", orderIndex: 2, isClosedWon: false, isClosedLost: false },
  { dealType: "application", name: "Under Review", color: "#7c3aed", orderIndex: 3, isClosedWon: false, isClosedLost: false },
  { dealType: "application", name: "Approved", color: "#059669", orderIndex: 4, isClosedWon: true, isClosedLost: false },
  { dealType: "application", name: "Rejected", color: "#dc2626", orderIndex: 5, isClosedWon: false, isClosedLost: true },
  { dealType: "application", name: "Withdrawn", color: "#be123c", orderIndex: 6, isClosedWon: false, isClosedLost: true },
  // tenant_rep
  { dealType: "tenant_rep", name: "New Lead", color: "#6b7280", orderIndex: 0, isClosedWon: false, isClosedLost: false },
  { dealType: "tenant_rep", name: "Client Onboarding", color: "#2563eb", orderIndex: 1, isClosedWon: false, isClosedLost: false },
  { dealType: "tenant_rep", name: "Actively Searching", color: "#0891b2", orderIndex: 2, isClosedWon: false, isClosedLost: false },
  { dealType: "tenant_rep", name: "Showing Scheduled", color: "#d97706", orderIndex: 3, isClosedWon: false, isClosedLost: false },
  { dealType: "tenant_rep", name: "Application In Progress", color: "#7c3aed", orderIndex: 4, isClosedWon: false, isClosedLost: false },
  { dealType: "tenant_rep", name: "Under Contract", color: "#a855f7", orderIndex: 5, isClosedWon: false, isClosedLost: false },
  { dealType: "tenant_rep", name: "Lease Signed", color: "#059669", orderIndex: 6, isClosedWon: true, isClosedLost: false },
];

async function seed() {
  console.log("Seeding database...");

  // Insert agents with ON CONFLICT DO NOTHING
  for (const agent of AGENTS) {
    await sql`
      INSERT INTO users (id, clerk_id, email, name, role, is_active)
      VALUES (${agent.id}, ${agent.clerkId}, ${agent.email}, ${agent.name}, ${agent.role}, true)
      ON CONFLICT (clerk_id) DO NOTHING
    `;
  }
  console.log(`✓ ${AGENTS.length} agents inserted`);

  // Insert pipeline stages
  for (const stage of STAGE_DEFS) {
    await sql`
      INSERT INTO pipeline_stages (deal_type, name, color, order_index, is_closed_won, is_closed_lost)
      VALUES (${stage.dealType}, ${stage.name}, ${stage.color}, ${stage.orderIndex}, ${stage.isClosedWon}, ${stage.isClosedLost})
    `;
  }
  console.log(`✓ ${STAGE_DEFS.length} pipeline stages inserted`);

  console.log("\nSeed complete! (No deals inserted — starting clean)");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
