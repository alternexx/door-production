import { db } from "../db";
import { deals, dealHistory } from "../db/schema";
import { eq } from "drizzle-orm";

async function testHistory() {
  // Get first deal
  const [deal] = await db.select().from(deals).limit(1);
  if (!deal) {
    console.log("No deals found");
    process.exit(1);
  }
  
  console.log("Testing deal:", deal.id, deal.title);
  console.log("Current notes:", deal.notes);
  
  // Make a test update via direct DB (simulating what API does)
  const oldNotes = deal.notes;
  const newNotes = (oldNotes || "") + " [test-" + Date.now() + "]";
  
  // Insert history
  await db.insert(dealHistory).values({
    dealId: deal.id,
    dealType: deal.dealType,
    field: "notes",
    oldValue: oldNotes,
    newValue: newNotes,
    changedById: deal.createdBy,
    changedByName: "Test",
    changedAt: new Date(),
  });
  
  // Update deal
  await db.update(deals).set({ notes: newNotes, updatedAt: new Date() }).where(eq(deals.id, deal.id));
  
  // Check history
  const history = await db.select().from(dealHistory).where(eq(dealHistory.dealId, deal.id));
  console.log("History entries:", history.length);
  history.forEach(h => console.log(" -", h.field, ":", h.oldValue, "→", h.newValue));
  
  process.exit(0);
}
testHistory();
