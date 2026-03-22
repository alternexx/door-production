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


