import type { DealType } from "@/db/schema";

// ── App Agent type (simplified User) ───────────────────────────────
export interface AppAgent {
  id: string;
  clerkId: string;
  email: string;
  name: string;
  role: "admin" | "agent";
  isActive: boolean;
  initials: string;
  color: string;
  createdAt: Date;
  updatedAt: Date;
}

// ── App Stage type ─────────────────────────────────────────────────
export interface AppStage {
  id: string;
  dealType: DealType;
  name: string;
  color: string;
  orderIndex: number;
  isClosedWon: boolean;
  isClosedLost: boolean;
  staleThresholdDays: number | null;
  createdAt: Date;
}

// ── App Deal ───────────────────────────────────────────────────────
export interface AppDeal {
  id: string;
  dealType: DealType;
  title: string;
  address: string;
  unit: string | null;
  borough: string;
  neighborhood: string | null;
  zip: string | null;
  buildingId?: string | null;
  price: number | null;
  status: "active" | "archived";
  source: string | null;
  notes: string | null;
  stageId: string;
  leaseStartDate: string | null;
  leaseEndDate: string | null;
  listedAt: Date | null;
  archivedAt: Date | null;
  archiveReason: string | null;
  showingAgentId: string | null;
  commissionData: unknown;
  showingScheduledAt?: string | Date | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  // Relations
  stage: AppStage;
  agents: { id: string; dealId: string; userId: string; assignedAt: Date; removedAt: Date | null; user: AppAgent }[];
  creator: AppAgent;
  // Extra fields for local state
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  showingDate?: string;
}

// ── Deal History Entry ─────────────────────────────────────────────
export interface DealHistoryEntry {
  id: string;
  dealId: string;
  dealType: DealType;
  field: string;
  oldValue: string | null;
  newValue: string | null;
  changedById: string;
  changedByName: string;
  changedAt: Date;
}

// ── Helpers ────────────────────────────────────────────────────────
function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

// ── Blank agent placeholder (used as initial state before API loads) ──
export const EMPTY_AGENT: AppAgent = {
  id: "",
  clerkId: "",
  email: "",
  name: "",
  role: "agent",
  isActive: false,
  initials: "",
  color: "#6b7280",
  createdAt: new Date(),
  updatedAt: new Date(),
};

// ── STAGE DEFINITIONS ──────────────────────────────────────────────
function makeStages(dealType: DealType, defs: { name: string; color: string; isClosedWon?: boolean; isClosedLost?: boolean }[]): AppStage[] {
  return defs.map((d, i) => ({
    id: `stage-${dealType}-${i}`,
    dealType,
    name: d.name,
    color: d.color,
    orderIndex: i,
    isClosedWon: d.isClosedWon ?? false,
    isClosedLost: d.isClosedLost ?? false,
    staleThresholdDays: null,
    createdAt: daysAgo(100),
  }));
}

export const STAGES: Record<DealType, AppStage[]> = {
  rental: makeStages("rental", [
    { name: "Run Comps", color: "#6366f1" },
    { name: "Not Started", color: "#94a3b8" },
    { name: "Schedule Photos", color: "#f59e0b" },
    { name: "Photos Scheduled", color: "#fbbf24" },
    { name: "Draft Rental Listing", color: "#fb923c" },
    { name: "Active", color: "#22c55e" },
    { name: "Showing Scheduled", color: "#3b82f6" },
    { name: "Under Contract (Rental)", color: "#8b5cf6" },
    { name: "Create and Log Invoice", color: "#06b6d4" },
    { name: "Invoice Sent to Management", color: "#0ea5e9" },
  ]),
  seller: makeStages("seller", [
    { name: "Value Add", color: "#6366f1" },
    { name: "Clients Actively Engaged", color: "#8b5cf6" },
    { name: "CMA/Draft Pitch", color: "#a78bfa" },
    { name: "Owners Interviewing", color: "#f59e0b" },
    { name: "Pitch Won", color: "#fbbf24" },
    { name: "Schedule Photos", color: "#fb923c" },
    { name: "Listing Live/Showing", color: "#22c55e" },
    { name: "Offer Received", color: "#4ade80" },
    { name: "Negotiation", color: "#f97316" },
    { name: "Offer Accepted", color: "#3b82f6" },
    { name: "Contract Sent Out", color: "#60a5fa" },
    { name: "Contract Signed", color: "#06b6d4" },
    { name: "Scheduling Inspection", color: "#0ea5e9" },
    { name: "Under Contract", color: "#14b8a6" },
    { name: "Closing Date Scheduled", color: "#0d9488" },
  ]),
  buyer: makeStages("buyer", [
    { name: "Client Onboarding", color: "#6366f1" },
    { name: "Pre Approval", color: "#8b5cf6" },
    { name: "Gathering Documents", color: "#a78bfa" },
    { name: "Showing Scheduled", color: "#3b82f6" },
    { name: "Run Comps/Sending out Offer", color: "#60a5fa" },
    { name: "Offer Accepted", color: "#22c55e" },
    { name: "Inspection Scheduled", color: "#4ade80" },
    { name: "Under Contract/Docs", color: "#f59e0b" },
    { name: "Closing Date", color: "#fbbf24" },
    { name: "Second Followup", color: "#fb923c" },
    { name: "Not Responsive", color: "#94a3b8" },
    { name: "Final Follow Up", color: "#f97316" },
  ]),
  application: makeStages("application", [
    { name: "Prescreening Complete", color: "#6366f1" },
    { name: "Application in Process", color: "#8b5cf6" },
    { name: "Clients Submitting Documentation", color: "#f87171" },
    { name: "Dotloop Sent", color: "#f59e0b" },
    { name: "Peer Review", color: "#f59e0b" },
    { name: "Compiled and Sent", color: "#fb923c" },
    { name: "Pending Landlord Feedback", color: "#f97316" },
    { name: "Approved/Change to In Contract", color: "#22c55e" },
    { name: "Welcome Email Sent", color: "#c4b5fd" },
    { name: "Pending Lease Signing and Payments", color: "#06b6d4" },
    { name: "Lease Signed and Paid", color: "#0ea5e9" },
    { name: "Ask for Review", color: "#14b8a6" },
    { name: "Temporarily Unavailable", color: "#808080" },
  ]),
  tenant_rep: makeStages("tenant_rep", [
    { name: "Tenant Onboarding", color: "#6366f1" },
    { name: "Tenant Rep Form Signed", color: "#8b5cf6" },
    { name: "Gathering Documents", color: "#a78bfa" },
    { name: "Scheduling Showings", color: "#3b82f6" },
    { name: "Working on App", color: "#60a5fa" },
    { name: "Client Approved", color: "#22c55e" },
    { name: "Client Closing/Create Invoice", color: "#4ade80" },
    { name: "Not Responsive", color: "#94a3b8" },
  ]),
};


