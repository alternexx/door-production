import type { ChecklistTemplateItem } from "@/db/schema";

export type DealChecklistViewItem = ChecklistTemplateItem & {
  completed: boolean;
  completedAt: string | null;
  completedBy: string | null;
  completedByName?: string | null;
};

export function normalizeChecklistTemplateItems(input: unknown): ChecklistTemplateItem[] {
  if (!Array.isArray(input)) return [];

  const seen = new Set<string>();
  const items: ChecklistTemplateItem[] = [];

  for (const [idx, raw] of input.entries()) {
    if (!raw || typeof raw !== "object") continue;
    const row = raw as Record<string, unknown>;
    const label = typeof row.label === "string" ? row.label.trim() : "";
    if (!label || seen.has(label.toLowerCase())) continue;

    const required = typeof row.required === "boolean" ? row.required : false;
    const order =
      typeof row.order === "number" && Number.isFinite(row.order)
        ? row.order
        : idx;

    items.push({ label, required, order });
    seen.add(label.toLowerCase());
  }

  return items.sort((a, b) => a.order - b.order);
}

export function buildDealChecklist(
  templateItems: ChecklistTemplateItem[],
  dealItems: Array<{
    templateItemLabel: string;
    completed: boolean;
    completedAt: Date | null;
    completedBy: string | null;
    completedByUser?: { name: string } | null;
  }>
): { items: DealChecklistViewItem[]; completedCount: number; totalCount: number; percent: number } {
  const dealMap = new Map(
    dealItems.map((item) => [item.templateItemLabel.trim().toLowerCase(), item])
  );

  const items: DealChecklistViewItem[] = templateItems.map((item) => {
    const found = dealMap.get(item.label.trim().toLowerCase());
    return {
      ...item,
      completed: found?.completed ?? false,
      completedAt: found?.completedAt ? found.completedAt.toISOString() : null,
      completedBy: found?.completedBy ?? null,
      completedByName: found?.completedByUser?.name ?? null,
    };
  });

  const completedCount = items.filter((item) => item.completed).length;
  const totalCount = items.length;
  const percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return { items, completedCount, totalCount, percent };
}
