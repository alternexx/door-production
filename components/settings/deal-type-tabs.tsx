"use client";

import { cn } from "@/lib/utils";

export const DEAL_TYPE_TABS = [
  { key: "rentals", label: "Rentals" },
  { key: "buyers", label: "Buyers" },
  { key: "sellers", label: "Sellers" },
  { key: "applications", label: "Applications" },
  { key: "tenant-rep", label: "Tenant Rep" },
] as const;

export type DealTypeTabKey = typeof DEAL_TYPE_TABS[number]["key"];

export interface DealTypeTabsProps {
  activeTab: DealTypeTabKey;
  onTabChange: (tab: DealTypeTabKey) => void;
}

export function DealTypeTabs({ activeTab, onTabChange }: DealTypeTabsProps) {
  return (
    <div className="flex gap-1 border-b border-border mb-4 overflow-x-auto scrollbar-none">
      {DEAL_TYPE_TABS.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onTabChange(tab.key)}
          className={cn(
            "px-3 py-1.5 text-[13px] font-medium transition-colors",
            activeTab === tab.key
              ? "text-[var(--fm-amber)] border-b-2 border-[var(--fm-amber)]"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
