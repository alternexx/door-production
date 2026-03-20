import { db } from "../db/index";
import { pipelineStages } from "../db/schema";
import { eq } from "drizzle-orm";
import type { DealType } from "../db/schema";

const COLORS: Record<string, string> = {
  "Not Started": "#64748b", "Schedule Photos": "#f59e0b", "Active": "#3b82f6",
  "Showing Scheduled": "#8b5cf6", "Under Contract (Rental)": "#f97316", "Rented": "#10b981",
  "CMA/Draft Pitch": "#64748b", "Value Add": "#f59e0b", "Clients Actively Engaging": "#3b82f6",
  "Listing Live/Showing": "#8b5cf6", "Owners Interviewing Clients": "#f97316",
  "Offer Accepted": "#06b6d4", "Contract Signed": "#10b981",
  "Client Onboarding": "#64748b", "Pre Approval": "#f59e0b",
  "Run Comps/Sending Out Offer": "#3b82f6", "Inspection Scheduled": "#8b5cf6",
  "Under Contract/Docs": "#f97316", "Second Followup": "#06b6d4", "Closed": "#10b981",
  "Welcome Email Sent Out": "#3b82f6", "Clients Submitting Documentation": "#8b5cf6",
  "Peer Review": "#f59e0b", "Pending Landlord Feedback": "#f97316",
  "Pending Lease Signing and Payments": "#06b6d4", "Lease Signed and Paid": "#10b981",
  "Rental Rejected": "#ef4444", "Rental Backed Out": "#dc2626", "Moved In Closed": "#059669",
  "Tenant Onboarding": "#3b82f6", "Scheduling Showings": "#8b5cf6",
};

const stagesByType: Record<DealType, string[]> = {
  rental: ["Not Started","Schedule Photos","Active","Showing Scheduled","Under Contract (Rental)","Rented"],
  seller: ["CMA/Draft Pitch","Value Add","Clients Actively Engaging","Schedule Photos","Listing Live/Showing","Owners Interviewing Clients","Offer Accepted","Contract Signed"],
  buyer: ["Client Onboarding","Pre Approval","Run Comps/Sending Out Offer","Showing Scheduled","Inspection Scheduled","Under Contract/Docs","Second Followup","Closed"],
  application: ["Welcome Email Sent Out","Clients Submitting Documentation","Peer Review","Pending Landlord Feedback","Pending Lease Signing and Payments","Lease Signed and Paid","Rental Rejected","Rental Backed Out","Moved In Closed"],
  tenant_rep: ["Tenant Onboarding","Scheduling Showings"],
};

async function main() {
  for (const [dealType, names] of Object.entries(stagesByType) as [DealType, string[]][]) {
    await db.delete(pipelineStages).where(eq(pipelineStages.dealType, dealType));
    for (let i = 0; i < names.length; i++) {
      const name = names[i];
      await db.insert(pipelineStages).values({
        dealType, name,
        color: COLORS[name] || "#6366f1",
        orderIndex: i,
        isClosedWon: ["Rented","Contract Signed","Closed","Lease Signed and Paid","Moved In Closed"].includes(name),
        isClosedLost: ["Rental Rejected","Rental Backed Out"].includes(name),
        staleThresholdDays: null,
      });
    }
    console.log("seeded:", dealType, names.length, "stages");
  }
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
