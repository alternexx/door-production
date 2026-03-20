"use client";

import { useState, useCallback } from "react";
import type { ColumnConfig } from "@/lib/types";
import type { DealType } from "@/db/schema";

function readStoredColumns(
  storageKey: string,
  fallback: ColumnConfig[]
): ColumnConfig[] {
  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      return JSON.parse(saved) as ColumnConfig[];
    }
  } catch {
    // ignore
  }

  return fallback;
}

export function useColumnConfig(dealType: DealType) {
  const storageKey = `door-columns-${dealType}`;

  const defaultColumns: ColumnConfig[] = [
    { id: "select", label: "Select", visible: true, order: 0 },
    { id: "title", label: "Title", visible: true, order: 1 },
    { id: "stage", label: "Stage", visible: true, order: 2 },
    { id: "borough", label: "Borough", visible: true, order: 3 },
    { id: "price", label: "Price", visible: true, order: 4 },
    { id: "agents", label: "Agents", visible: true, order: 5 },
    { id: "source", label: "Source", visible: true, order: 6 },
    { id: "daysOnMarket", label: "Days on Market", visible: dealType === "rental" || dealType === "seller", order: 7 },
    { id: "progress", label: "Progress", visible: true, order: 8 },
    { id: "activity", label: "Activity", visible: true, order: 9 },
    { id: "actions", label: "Actions", visible: true, order: 10 },
  ];

  const [columnsByKey, setColumnsByKey] = useState<Record<string, ColumnConfig[]>>(
    () => ({
      [storageKey]: readStoredColumns(storageKey, defaultColumns),
    })
  );

  const columns = columnsByKey[storageKey] ?? readStoredColumns(storageKey, defaultColumns);

  const updateColumns = useCallback(
    (newColumns: ColumnConfig[]) => {
      setColumnsByKey((prev) => ({
        ...prev,
        [storageKey]: newColumns,
      }));
      localStorage.setItem(storageKey, JSON.stringify(newColumns));
    },
    [storageKey]
  );

  return { columns, updateColumns, defaultColumns };
}
