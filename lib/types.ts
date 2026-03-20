import type { Deal, DealAgent, DealHistory, PipelineStage, User } from "@/db/schema";

export type DealWithRelations = Deal & {
  stage: PipelineStage;
  agents: (DealAgent & { user: User })[];
  creator: User;
};

export type DealHistoryEntry = DealHistory;

export type StageWithCounts = PipelineStage & {
  dealCount: number;
};

export interface ColumnConfig {
  id: string;
  label: string;
  visible: boolean;
  order: number;
}

export const BOROUGHS = [
  "Manhattan",
  "Brooklyn",
  "Queens",
  "Bronx",
  "Staten Island",
] as const;

export const SOURCES = [
  { value: "cold_call", label: "Cold Call" },
  { value: "referral", label: "Referral" },
  { value: "streeteasy", label: "StreetEasy" },
  { value: "zillow", label: "Zillow" },
  { value: "walk_in", label: "Walk-In" },
  { value: "social", label: "Social Media" },
  { value: "website", label: "Website" },
  { value: "other", label: "Other" },
] as const;

export const DEAL_TYPE_LABELS: Record<string, string> = {
  rental: "Rentals",
  seller: "Sellers",
  buyer: "Buyers",
  application: "Applications",
  tenant_rep: "Tenant Rep",
};

export const DEAL_TYPE_SINGULAR: Record<string, string> = {
  rental: "Rental",
  seller: "Seller",
  buyer: "Buyer",
  application: "Application",
  tenant_rep: "Tenant Rep",
};
