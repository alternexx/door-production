"use client";

import { useCallback, useState } from "react";
import { GripVertical, Lock, Plus, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import {
  getDefaultColumnConfig,
  getColumnStorageKey,
  getFieldLabel,
  type ColumnConfig,
} from "@/lib/deal-types";
import { DealTypeTabs, type DealTypeTabKey } from "./deal-type-tabs";

// =====================
// Sortable Column Item
// =====================
interface SortableColumnItemProps {
  column: ColumnConfig;
  dealType: string;
  onToggle: (key: string) => void;
}

function SortableColumnItem({ column, dealType, onToggle }: SortableColumnItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: column.key });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isActions = column.key === "actions";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2 px-4 py-2 rounded-md",
        isDragging ? "bg-accent/80 shadow-md z-10" : "hover:bg-accent/50"
      )}
    >
      <button
        type="button"
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <label className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer text-sm">
        <input
          type="checkbox"
          checked={column.visible}
          onChange={() => !isActions && onToggle(column.key)}
          disabled={isActions}
          className="h-4 w-4 shrink-0 rounded border-gray-300 accent-[var(--fm-amber)] disabled:opacity-50"
        />
        <span className={cn("text-[14px]", !column.visible && "text-muted-foreground")}>
          {getFieldLabel(dealType, column.key)}
        </span>
        {isActions && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
      </label>
    </div>
  );
}

// =====================
// Load helper
// =====================
function loadColumnsFromStorage(dealType: string): ColumnConfig[] {
  if (typeof window === "undefined") return getDefaultColumnConfig(dealType);
  const storageKey = getColumnStorageKey(dealType);
  try {
    const stored = localStorage.getItem(storageKey);
    if (stored) return JSON.parse(stored);
  } catch {
    // Ignore parse errors
  }
  return getDefaultColumnConfig(dealType);
}

// =====================
// Columns Configure Modal
// =====================
interface ColumnsConfigureModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ColumnsConfigureModal({ open, onOpenChange }: ColumnsConfigureModalProps) {
  const [activeDealType, setActiveDealType] = useState<DealTypeTabKey>("rentals");
  const [columns, setColumns] = useState<ColumnConfig[]>(() => loadColumnsFromStorage("rentals"));
  const [key, setKey] = useState(0);
  const [shelfOpen, setShelfOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setActiveDealType("rentals");
      setColumns(loadColumnsFromStorage("rentals"));
      setKey((k) => k + 1);
      setShelfOpen(false);
    }
    onOpenChange(newOpen);
  };

  const handleTabChange = (tab: DealTypeTabKey) => {
    setActiveDealType(tab);
    setColumns(loadColumnsFromStorage(tab));
    setKey((k) => k + 1);
    setShelfOpen(false);
  };

  const saveToStorage = useCallback((cols: ColumnConfig[], dealType: string) => {
    try {
      localStorage.setItem(getColumnStorageKey(dealType), JSON.stringify(cols));
    } catch {}
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = columns.findIndex((i) => i.key === active.id);
    const newIndex = columns.findIndex((i) => i.key === over.id);
    const newOrder = arrayMove(columns, oldIndex, newIndex);
    setColumns(newOrder);
    saveToStorage(newOrder, activeDealType);
  }, [columns, saveToStorage, activeDealType]);

  const handleToggle = useCallback((key: string) => {
    const updated = columns.map((c) => c.key === key ? { ...c, visible: !c.visible } : c);
    setColumns(updated);
    saveToStorage(updated, activeDealType);
  }, [columns, saveToStorage, activeDealType]);

  // Hidden columns (not visible, not actions) — shown in the Add Column shelf
  const hiddenColumns = columns.filter(c => !c.visible && c.key !== "actions");

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[680px] p-0 overflow-visible" showCloseButton>
        <div className="flex flex-row h-[560px]">
          {/* Main content */}
          <div className="flex flex-col flex-1 min-w-0">
            <div className="px-6 pt-6 pb-4 shrink-0">
              <DialogHeader>
                <DialogTitle>Configure Column Defaults</DialogTitle>
              </DialogHeader>
            </div>

            <div className="px-6 shrink-0">
              <DealTypeTabs activeTab={activeDealType} onTabChange={handleTabChange} />
            </div>

            <div className="flex flex-col flex-1 min-h-0">
              <div className="flex items-center px-4 py-2 border-b border-border shrink-0">
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Column Defaults
                </span>
              </div>

              <div className="overflow-y-auto overflow-x-hidden flex-1">
                <div className="py-2" key={key}>
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={columns.map((c) => c.key)}
                      strategy={verticalListSortingStrategy}
                    >
                      {columns.map((column) => (
                        <SortableColumnItem
                          key={column.key}
                          column={column}
                          dealType={activeDealType}
                          onToggle={handleToggle}
                        />
                      ))}
                    </SortableContext>
                  </DndContext>
                </div>
              </div>

              {/* Sticky Add Column footer */}
              <button
                onClick={() => setShelfOpen((v) => !v)}
                className="w-full flex items-center justify-center gap-1.5 py-2.5 text-[13px] text-muted-foreground hover:text-foreground transition-colors border-t border-border shrink-0"
              >
                <Plus className="h-4 w-4" />
                Add Column
              </button>
            </div>
          </div>

          {/* Add Column Shelf */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: "100%",
              width: shelfOpen ? 220 : 0,
              height: "100%",
              borderLeft: shelfOpen ? "1px solid var(--border)" : "none",
              borderRadius: "0 12px 12px 0",
              background: "var(--background)",
              boxShadow: shelfOpen ? "4px 0 16px rgba(0,0,0,0.08)" : "none",
              transition: "width 0.25s cubic-bezier(0.4,0,0.2,1)",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              zIndex: 10,
            }}
          >
            <div style={{ width: 220, display: "flex", flexDirection: "column", height: "100%" }}>
              {shelfOpen && (
                <>
                  <div className="flex items-center justify-between px-3.5 py-3 border-b">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Add Column</span>
                    <button onClick={() => setShelfOpen(false)} className="text-muted-foreground hover:text-foreground">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto py-1.5">
                    {hiddenColumns.length === 0 ? (
                      <div className="flex items-center justify-center h-full p-4 text-[13px] text-muted-foreground text-center">
                        All columns are already visible
                      </div>
                    ) : (
                      hiddenColumns.map(column => (
                        <button
                          key={column.key}
                          type="button"
                          onClick={() => { handleToggle(column.key); }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-accent/50 transition-colors text-left"
                        >
                          <Plus className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="text-[14px]">{getFieldLabel(activeDealType, column.key)}</span>
                        </button>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
