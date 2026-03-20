"use client"

import { useState, useCallback } from "react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Columns3, GripVertical, Lock, RotateCcw } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  ALL_COLUMNS,
  getDefaultColumnConfig,
  getColumnStorageKey,
  getFieldLabel,
  type ColumnConfig,
} from "@/lib/deal-types"

interface ColumnManagerProps {
  dealType: string
  columns: ColumnConfig[]
  onChange: (columns: ColumnConfig[]) => void
}

interface SortableItemProps {
  column: ColumnConfig
  dealType: string
  onToggle: (key: string) => void
}

function SortableItem({ column, dealType, onToggle }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: column.key })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const isActions = column.key === "actions"

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-md",
        isDragging ? "bg-accent/80 shadow-md z-10" : "hover:bg-accent/50"
      )}
    >
      <button
        type="button"
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      <label className="flex items-center gap-2 flex-1 cursor-pointer text-sm">
        <input
          type="checkbox"
          checked={column.visible}
          onChange={() => !isActions && onToggle(column.key)}
          disabled={isActions}
          className="h-3.5 w-3.5 rounded border-gray-300 accent-[var(--fm-amber)] disabled:opacity-50"
        />
        <span className={cn("text-[13px]", !column.visible && "text-muted-foreground")}>
          {getFieldLabel(dealType, column.key)}
        </span>
        {isActions && <Lock className="h-3 w-3 text-muted-foreground" />}
      </label>
    </div>
  )
}

export function ColumnManager({ dealType, columns, onChange }: ColumnManagerProps) {
  const [open, setOpen] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = columns.findIndex((i) => i.key === active.id)
    const newIndex = columns.findIndex((i) => i.key === over.id)
    const newOrder = arrayMove(columns, oldIndex, newIndex)
    onChange(newOrder)
    saveToStorage(dealType, newOrder)
  }, [columns, onChange, dealType])

  const handleToggle = useCallback((key: string) => {
    const updated = columns.map((c) =>
      c.key === key ? { ...c, visible: !c.visible } : c
    )
    onChange(updated)
    saveToStorage(dealType, updated)
  }, [columns, onChange, dealType])

  const handleReset = useCallback(() => {
    const defaults = getDefaultColumnConfig(dealType)
    onChange(defaults)
    saveToStorage(dealType, defaults)
  }, [dealType, onChange])

  const visibleCount = columns.filter((c) => c.visible).length

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className="h-9 w-9 hidden md:flex items-center justify-center hover:text-foreground text-muted-foreground transition-colors" title="Manage columns">
        <span className="text-[15px] font-bold tracking-[-2px] leading-none">|||</span>
      </PopoverTrigger>
      <PopoverContent className="w-[260px] p-0" align="end">
        <div className="px-3 py-2.5 border-b flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Columns
          </span>
          <button
            onClick={handleReset}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            <RotateCcw className="h-3 w-3" />
            Reset
          </button>
        </div>
        <div className="p-2 max-h-[320px] overflow-y-auto">
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
                <SortableItem
                  key={column.key}
                  column={column}
                  dealType={dealType}
                  onToggle={handleToggle}
                />
              ))}
            </SortableContext>
          </DndContext>
        </div>
      </PopoverContent>
    </Popover>
  )
}

function saveToStorage(dealType: string, cols: ColumnConfig[]) {
  try {
    localStorage.setItem(getColumnStorageKey(dealType), JSON.stringify(cols))
  } catch {
    // Ignore storage errors
  }
}

export function loadColumnConfig(dealType: string): ColumnConfig[] {
  if (typeof window === "undefined") {
    return getDefaultColumnConfig(dealType)
  }
  const storageKey = getColumnStorageKey(dealType)
  try {
    const stored = localStorage.getItem(storageKey)
    if (stored) {
      const parsed = JSON.parse(stored) as ColumnConfig[]
      const normalized = parsed.map((col) => {
        if ((dealType === "rentals" || dealType === "sellers") && col.key === "property") {
          return { ...col, key: "address" }
        }
        return col
      })

      const allowed = new Set(ALL_COLUMNS[dealType] || [])
      const deduped: ColumnConfig[] = []
      for (const col of normalized) {
        if (!allowed.has(col.key)) continue
        if (deduped.some((c) => c.key === col.key)) continue
        deduped.push(col)
      }

      if (deduped.length > 0) {
        const defaults = getDefaultColumnConfig(dealType)
        const missing = defaults
          .filter((d) => !deduped.some((c) => c.key === d.key))
          .map((d) => ({ ...d, visible: false }))
        return [...deduped, ...missing]
      }
    }
  } catch {
    // Ignore parse errors
  }
  return getDefaultColumnConfig(dealType)
}
