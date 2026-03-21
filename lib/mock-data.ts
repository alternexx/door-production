import type { DealType } from "@/db/schema";

// ── Mock Agent type (simplified User) ──────────────────────────────
export interface MockAgent {
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

// ── Mock Stage type ────────────────────────────────────────────────
export interface MockStage {
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

// ── Mock Deal ──────────────────────────────────────────────────────
export interface MockDeal {
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
  stage: MockStage;
  agents: { id: string; dealId: string; userId: string; assignedAt: Date; removedAt: Date | null; user: MockAgent }[];
  creator: MockAgent;
  // Extra fields for local state
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  showingDate?: string;
}

// ── Mock History Entry ─────────────────────────────────────────────
export interface MockHistoryEntry {
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
let _idCounter = 1000;
function uid(): string {
  return `mock-${++_idCounter}-${Math.random().toString(36).slice(2, 8)}`;
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function hoursAgo(n: number): Date {
  const d = new Date();
  d.setHours(d.getHours() - n);
  return d;
}

// ── MOCK AGENTS ────────────────────────────────────────────────────
export const MOCK_AGENTS: MockAgent[] = [
  {
    id: "agent-1",
    clerkId: "clerk_1",
    email: "mromero@hhnyc.com",
    name: "Mark Romero",
    role: "admin",
    isActive: true,
    initials: "MR",
    color: "#d97706",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "agent-2",
    clerkId: "clerk_2",
    email: "jsmith@hhnyc.com",
    name: "Jordan Smith",
    role: "agent",
    isActive: true,
    initials: "JS",
    color: "#2563eb",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "agent-3",
    clerkId: "clerk_3",
    email: "agarcia@hhnyc.com",
    name: "Alex Garcia",
    role: "agent",
    isActive: true,
    initials: "AG",
    color: "#16a34a",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "agent-4",
    clerkId: "clerk_4",
    email: "tlee@hhnyc.com",
    name: "Taylor Lee",
    role: "agent",
    isActive: true,
    initials: "TL",
    color: "#9333ea",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

export const CURRENT_AGENT: MockAgent = {
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
function makeStages(dealType: DealType, defs: { name: string; color: string; isClosedWon?: boolean; isClosedLost?: boolean }[]): MockStage[] {
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

export const STAGES: Record<DealType, MockStage[]> = {
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

// ── ARCHIVE REASONS ────────────────────────────────────────────────
export const ARCHIVE_REASONS: Record<DealType, { label: string; outcome: "won" | "lost" }[]> = {
  rental: [
    { label: "Rented / Moved In", outcome: "won" },
    { label: "Tenant Backed Out", outcome: "lost" },
    { label: "Owner Backed Out", outcome: "lost" },
    { label: "No Longer Available", outcome: "lost" },
  ],
  seller: [
    { label: "Sold / Closed", outcome: "won" },
    { label: "Listing Withdrawn", outcome: "lost" },
    { label: "Listing Expired", outcome: "lost" },
    { label: "Owner Backed Out", outcome: "lost" },
  ],
  buyer: [
    { label: "Purchased / Closed", outcome: "won" },
    { label: "Buyer Backed Out", outcome: "lost" },
    { label: "Buyer Unresponsive", outcome: "lost" },
    { label: "Budget Changed", outcome: "lost" },
  ],
  application: [
    { label: "Moved In / Closed", outcome: "won" },
    { label: "Application Rejected", outcome: "lost" },
    { label: "Applicant Withdrew", outcome: "lost" },
    { label: "Rental Backed Out", outcome: "lost" },
  ],
  tenant_rep: [
    { label: "Deal Closed", outcome: "won" },
    { label: "Client Backed Out", outcome: "lost" },
    { label: "Client Unresponsive", outcome: "lost" },
  ],
};

// ── MOCK DEAL FACTORY ──────────────────────────────────────────────
function makeDealAgents(dealId: string, agentIds: string[]): MockDeal["agents"] {
  return agentIds.map((agentId) => {
    const agent = MOCK_AGENTS.find((a) => a.id === agentId)!;
    return {
      id: uid(),
      dealId,
      userId: agentId,
      assignedAt: daysAgo(10),
      removedAt: null,
      user: agent,
    };
  });
}

interface DealSeed {
  title: string;
  address: string;
  unit?: string;
  borough: string;
  neighborhood?: string;
  price?: number;
  source?: string;
  notes?: string;
  stageIndex: number;
  agentIds: string[];
  daysOld: number;
  updatedHoursAgo: number;
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
}

function makeDeal(dealType: DealType, seed: DealSeed): MockDeal {
  const stages = STAGES[dealType];
  const stage = stages[seed.stageIndex];
  const id = uid();
  return {
    id,
    dealType,
    title: seed.title,
    address: seed.address,
    unit: seed.unit ?? null,
    borough: seed.borough,
    neighborhood: seed.neighborhood ?? null,
    zip: null,
    price: seed.price ?? null,
    status: "active",
    source: seed.source ?? null,
    notes: seed.notes ?? null,
    stageId: stage.id,
    leaseStartDate: null,
    leaseEndDate: null,
    listedAt: daysAgo(seed.daysOld),
    archivedAt: null,
    archiveReason: null,
    showingAgentId: null,
    commissionData: null,
    createdBy: MOCK_AGENTS[0].id,
    createdAt: daysAgo(seed.daysOld),
    updatedAt: hoursAgo(seed.updatedHoursAgo),
    stage,
    agents: makeDealAgents(id, seed.agentIds),
    creator: MOCK_AGENTS[0],
    clientName: seed.clientName,
    clientEmail: seed.clientEmail,
    clientPhone: seed.clientPhone,
  };
}

// ── MOCK DEALS PER TYPE ────────────────────────────────────────────
export const INITIAL_DEALS: Record<DealType, MockDeal[]> = {
  rental: [],
  seller: [],
  buyer: [],
  application: [],
  tenant_rep: [],
};

// ── MOCK HISTORY ENTRIES ───────────────────────────────────────────
export function generateMockHistory(deal: MockDeal): MockHistoryEntry[] {
  const entries: MockHistoryEntry[] = [];
  const stages = STAGES[deal.dealType];

  // Stage creation
  entries.push({
    id: uid(),
    dealId: deal.id,
    dealType: deal.dealType,
    field: "stage",
    oldValue: null,
    newValue: stages[0].name,
    changedById: deal.createdBy,
    changedByName: deal.creator.name,
    changedAt: deal.createdAt,
  });

  // If not on first stage, add intermediate stage changes
  const currentStageIdx = stages.findIndex((s) => s.id === deal.stageId);
  for (let i = 1; i <= currentStageIdx; i++) {
    const agent = MOCK_AGENTS[i % MOCK_AGENTS.length];
    entries.push({
      id: uid(),
      dealId: deal.id,
      dealType: deal.dealType,
      field: "stage",
      oldValue: stages[i - 1].name,
      newValue: stages[i].name,
      changedById: agent.id,
      changedByName: agent.name,
      changedAt: new Date(deal.createdAt.getTime() + i * 86400000),
    });
  }

  // Price change
  if (deal.price) {
    entries.push({
      id: uid(),
      dealId: deal.id,
      dealType: deal.dealType,
      field: "price",
      oldValue: `$${(deal.price * 1.1).toLocaleString()}`,
      newValue: `$${deal.price.toLocaleString()}`,
      changedById: deal.agents[0]?.userId ?? deal.createdBy,
      changedByName: deal.agents[0]?.user.name ?? deal.creator.name,
      changedAt: hoursAgo(48),
    });
  }

  // Notes update
  if (deal.notes) {
    entries.push({
      id: uid(),
      dealId: deal.id,
      dealType: deal.dealType,
      field: "notes",
      oldValue: null,
      newValue: deal.notes,
      changedById: deal.createdBy,
      changedByName: deal.creator.name,
      changedAt: hoursAgo(24),
    });
  }

  // Agent assignment
  if (deal.agents.length > 1) {
    entries.push({
      id: uid(),
      dealId: deal.id,
      dealType: deal.dealType,
      field: "agents",
      oldValue: deal.agents[0].user.name,
      newValue: deal.agents.map((a) => a.user.name).join(", "),
      changedById: deal.createdBy,
      changedByName: deal.creator.name,
      changedAt: hoursAgo(72),
    });
  }

  return entries.sort((a, b) => b.changedAt.getTime() - a.changedAt.getTime());
}
