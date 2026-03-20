import { z } from "zod";

export const dealTypeEnum = z.enum([
  "rental",
  "seller",
  "buyer",
  "application",
  "tenant_rep",
]);

export const sourceEnum = z.enum([
  "cold_call",
  "referral",
  "streeteasy",
  "zillow",
  "walk_in",
  "social",
  "website",
  "other",
]);

export const createDealSchema = z.object({
  dealType: dealTypeEnum,
  title: z.string().min(1, "Title is required"),
  address: z.string().min(1, "Address is required"),
  unit: z.string().optional(),
  borough: z.string().min(1, "Borough is required"),
  neighborhood: z.string().optional(),
  zip: z.string().optional(),
  price: z.number().int().positive().optional(),
  source: sourceEnum.optional(),
  notes: z.string().optional(),
  stageId: z.string().uuid(),
  agentIds: z.array(z.string().uuid()).optional(),
});

export const updateDealSchema = z.object({
  title: z.string().min(1).optional(),
  address: z.string().min(1).optional(),
  unit: z.string().nullable().optional(),
  borough: z.string().min(1).optional(),
  neighborhood: z.string().nullable().optional(),
  zip: z.string().nullable().optional(),
  price: z.number().int().positive().nullable().optional(),
  source: sourceEnum.nullable().optional(),
  notes: z.string().nullable().optional(),
  status: z.enum(["active", "archived"]).optional(),
  archiveReason: z.string().nullable().optional(),
  leaseStartDate: z.string().nullable().optional(),
  leaseEndDate: z.string().nullable().optional(),
  agentIds: z.array(z.string().uuid()).optional(),
});

export const stageChangeSchema = z.object({
  stageId: z.string().uuid(),
  showingDate: z.string().optional(),
  showingAgentId: z.string().uuid().optional(),
});

export type CreateDealInput = z.infer<typeof createDealSchema>;
export type UpdateDealInput = z.infer<typeof updateDealSchema>;
export type StageChangeInput = z.infer<typeof stageChangeSchema>;
