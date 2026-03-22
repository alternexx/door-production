"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { useDealContext } from "@/lib/deal-context";
import { STAGES, type DealHistoryEntry } from "@/lib/mock-data";

interface HistorySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dealId: string | null;
  dealTitle: string;
}

export function HistorySheet({
  open,
  onOpenChange,
  dealId,
  dealTitle,
}: HistorySheetProps) {
  const { getHistory } = useDealContext();
  const entries = dealId ? getHistory(dealId) : [];

  const filterEntries = (field?: string) =>
    field ? entries.filter((e) => e.field === field) : entries;

  const getStageColor = (stageName: string | null): string | undefined => {
    if (!stageName) return undefined;
    for (const typeStages of Object.values(STAGES)) {
      const found = typeStages.find((s) => s.name === stageName);
      if (found) return found.color;
    }
    return undefined;
  };

  const renderStageBadge = (name: string | null) => {
    if (!name) return null;
    const color = getStageColor(name);
    if (!color) return <span>{name}</span>;
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium border"
        style={{
          backgroundColor: `${color}15`,
          color: color,
          borderColor: `${color}30`,
        }}
      >
        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
        {name}
      </span>
    );
  };

  const renderEntry = (entry: DealHistoryEntry) => (
    <div
      key={entry.id}
      className="border-b border-[#e5e7eb] py-3 last:border-0"
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium text-[#1a1a1a] capitalize">
          {entry.field}
        </span>
        <span className="text-xs text-[#6b7280]">
          {formatDistanceToNow(new Date(entry.changedAt), { addSuffix: true })}
        </span>
      </div>
      <div className="text-xs text-[#6b7280]">
        by {entry.changedByName}
      </div>
      <div className="mt-1 flex items-center gap-2 text-sm">
        {entry.field === "stage" ? (
          <>
            {entry.oldValue && renderStageBadge(entry.oldValue)}
            {entry.oldValue && <span className="text-[#6b7280]">→</span>}
            {renderStageBadge(entry.newValue)}
          </>
        ) : (
          <>
            {entry.oldValue && (
              <span className="line-through text-[#6b7280]">
                {entry.oldValue}
              </span>
            )}
            {entry.oldValue && <span className="text-[#6b7280]">→</span>}
            <span className="text-[#1a1a1a]">{entry.newValue}</span>
          </>
        )}
      </div>
    </div>
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:w-[540px] bg-white">
        <SheetHeader>
          <SheetTitle className="text-[#1a1a1a]">
            History: {dealTitle}
          </SheetTitle>
        </SheetHeader>
        <Tabs defaultValue="all" className="mt-4">
          <TabsList className="w-full">
            <TabsTrigger value="all" className="flex-1">All</TabsTrigger>
            <TabsTrigger value="stage" className="flex-1">Stage</TabsTrigger>
            <TabsTrigger value="price" className="flex-1">Price</TabsTrigger>
            <TabsTrigger value="notes" className="flex-1">Notes</TabsTrigger>
            <TabsTrigger value="agents" className="flex-1">Agents</TabsTrigger>
            <TabsTrigger value="details" className="flex-1">Details</TabsTrigger>
          </TabsList>
          {["all", "stage", "price", "notes", "agents", "details"].map((tab) => (
            <TabsContent key={tab} value={tab}>
              <ScrollArea className="h-[calc(100vh-200px)]">
                {filterEntries(tab === "all" ? undefined : tab).length === 0 ? (
                  <p className="text-sm text-[#6b7280] py-4">
                    No history entries
                  </p>
                ) : (
                  filterEntries(tab === "all" ? undefined : tab).map(renderEntry)
                )}
              </ScrollArea>
            </TabsContent>
          ))}
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
