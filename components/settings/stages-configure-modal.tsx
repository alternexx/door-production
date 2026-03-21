"use client";

import { useEffect, useRef, useState } from "react";
import { GripVertical, Trash2, Plus, X, PieChart } from "lucide-react";
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
import { dealTypes } from "@/lib/deal-types";
import { DealTypeTabs, type DealTypeTabKey } from "./deal-type-tabs";

// =====================
// Stage Color Picker
// =====================
// 12 hue rows × 9 lightness cols = 108 colors
// Each row = one hue, dark left → light right
const _ROWS: string[][] = [
  ["#7f1d1d","#991b1b","#b91c1c","#dc2626","#ef4444","#f87171","#fca5a5","#fecaca","#fee2e2"], // Red
  ["#7c2d12","#9a3412","#c2410c","#ea580c","#f97316","#fb923c","#fdba74","#fed7aa","#ffedd5"], // Orange
  ["#78350f","#92400e","#b45309","#d97706","#f59e0b","#fbbf24","#fcd34d","#fde68a","#fef9c3"], // Amber
  ["#365314","#3f6212","#4d7c0f","#65a30d","#84cc16","#a3e635","#bef264","#d9f99d","#ecfccb"], // Lime
  ["#14532d","#166534","#15803d","#16a34a","#22c55e","#4ade80","#86efac","#bbf7d0","#dcfce7"], // Green
  ["#134e4a","#115e59","#0f766e","#0d9488","#14b8a6","#2dd4bf","#5eead4","#99f6e4","#ccfbf1"], // Teal
  ["#164e63","#155e75","#0e7490","#0891b2","#06b6d4","#22d3ee","#67e8f9","#a5f3fc","#cffafe"], // Cyan
  ["#0c4a6e","#075985","#0369a1","#0284c7","#0ea5e9","#38bdf8","#7dd3fc","#bae6fd","#e0f2fe"], // Sky
  ["#1e3a8a","#1e40af","#1d4ed8","#2563eb","#3b82f6","#60a5fa","#93c5fd","#bfdbfe","#dbeafe"], // Blue
  ["#312e81","#3730a3","#4338ca","#4f46e5","#6366f1","#818cf8","#a5b4fc","#c7d2fe","#e0e7ff"], // Indigo
  ["#4c1d95","#5b21b6","#6d28d9","#7c3aed","#8b5cf6","#a78bfa","#c4b5fd","#ddd6fe","#ede9fe"], // Purple
  ["#831843","#9d174d","#be185d","#db2777","#ec4899","#f472b6","#f9a8d4","#fbcfe8","#fce7f3"], // Pink
  ["#000000","#1f1f1f","#404040","#595959","#808080","#a6a6a6","#bfbfbf","#d9d9d9","#ffffff"], // Grayscale
];
const PRESET_COLORS: string[] = _ROWS.flat();

interface ColorSwatchProps {
  color: string;
  stageName: string;
  onOpenShelf: (stageName: string, currentColor: string) => void;
}

function ColorSwatch({ color, stageName, onOpenShelf }: ColorSwatchProps) {
  return (
    <button
      type="button"
      onClick={() => onOpenShelf(stageName, color)}
      className="h-4 w-4 rounded-full cursor-pointer ring-1 ring-border hover:ring-2 hover:ring-[var(--fm-amber)] shrink-0"
      style={{ backgroundColor: color }}
      title="Change color"
    />
  );
}

// =====================
// Sortable Stage Item (simple, no groups)
// =====================
interface SortableStageItemProps {
  id: string;
  stage: string;
  color: string;
  onRename: (oldName: string, newName: string) => void;
  onDelete: (name: string) => void;
  onOpenColorShelf: (stageName: string, currentColor: string) => void;
  canDelete: boolean;
}

function SortableStageItem({ id, stage, color, onRename, onDelete, onOpenColorShelf, canDelete }: SortableStageItemProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(stage);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleSave = () => {
    const trimmed = value.trim();
    if (trimmed && trimmed !== stage) {
      onRename(stage, trimmed);
    } else {
      setValue(stage);
    }
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      setValue(stage);
      setEditing(false);
    }
  };

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
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground shrink-0"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      {/* Color swatch */}
      <ColorSwatch
        color={color}
        stageName={stage}
        onOpenShelf={onOpenColorShelf}
      />

      {editing ? (
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          autoFocus
          className="flex-1 min-w-0 bg-transparent border border-border rounded px-2 py-0.5 text-[14px] text-foreground focus:outline-none focus:ring-1 focus:ring-[var(--fm-amber)]"
        />
      ) : (
        <span
          onClick={() => setEditing(true)}
          className="flex-1 min-w-0 truncate text-[14px] text-foreground cursor-pointer hover:text-[var(--fm-amber)]"
        >
          {stage}
        </span>
      )}

      <button
        type="button"
        onClick={() => onDelete(stage)}
        disabled={!canDelete}
        className={cn(
          "shrink-0 text-muted-foreground transition-colors",
          canDelete ? "hover:text-red-500" : "opacity-30 cursor-not-allowed"
        )}
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

// =====================
// Group Helpers
// =====================
const GROUP_BLOCK_ID = "__group_block__";

function StaticGroupHeading({ name, onNameChange }: { name: string; onNameChange: (v: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  return (
    <div className="flex items-center mx-2 px-3 py-1.5 rounded-md border border-border/60 bg-muted/40 my-1">
      {editing ? (
        <input
          autoFocus type="text" value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={() => { onNameChange(draft); setEditing(false); }}
          onKeyDown={e => { if (e.key === "Enter") { onNameChange(draft); setEditing(false); } if (e.key === "Escape") setEditing(false); }}
          placeholder="Group 1"
          className="flex-1 min-w-0 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground bg-transparent border-none outline-none placeholder:text-muted-foreground/40"
        />
      ) : (
        <span
          onClick={() => { setDraft(name); setEditing(true); }}
          className="flex-1 min-w-0 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
        >
          {name || "Group 1"}
        </span>
      )}
    </div>
  );
}

function SortableGroupBlock({ id, placeholder = "Group", name, onNameChange, onDelete }: { id: string; placeholder?: string; name: string; onNameChange: (v: string) => void; onDelete: () => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  const handleSave = () => {
    onNameChange(draft);
    setEditing(false);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2 mx-2 px-3 py-1.5 rounded-md border border-border/60 bg-muted/40 my-1",
        isDragging ? "shadow-md" : "hover:bg-muted/70"
      )}
    >
      <button type="button" className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground shrink-0" {...attributes} {...listeners}>
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      {editing ? (
        <input
          autoFocus type="text" value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={handleSave}
          onKeyDown={e => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") setEditing(false); }}
          placeholder={placeholder}
          className="flex-1 min-w-0 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground bg-transparent border-none outline-none placeholder:text-muted-foreground/40"
        />
      ) : (
        <span
          onClick={() => { setDraft(name); setEditing(true); }}
          className="flex-1 min-w-0 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
        >
          {name || placeholder}
        </span>
      )}
      <button type="button" onClick={onDelete} className="shrink-0 text-muted-foreground hover:text-red-500 transition-colors ml-1">
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// =====================
// Unique ID helpers — stage names aren't unique, so we suffix with :::index
// =====================
function toId(name: string, index: number): string {
  return `${name}:::${index}`;
}
function fromId(id: string): string {
  return id.includes(":::") ? id.split(":::")[0] : id;
}
// Convert a plain names array to IDs
function namesToIds(names: string[]): string[] {
  return names.map((n, i) => toId(n, i));
}
// Convert IDs back to plain names (for storage)
function idsToNames(ids: string[]): string[] {
  return ids.filter(id => !id.startsWith("__group_") && id !== "__group_block__").map(fromId);
}

// =====================
// Storage helpers
// =====================
function loadStagesFromStorage(dealType: string): string[] {
  if (typeof window === "undefined") return dealTypes[dealType]?.stages || [];
  try {
    const stored = localStorage.getItem(`door-config-stages-${dealType}`);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return dealTypes[dealType]?.stages || [];
}

function loadStageColorsFromStorage(dealType: string, prefix = "door-config"): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const stored = localStorage.getItem(`${prefix}-stage-colors-${dealType}`);
    if (stored) return JSON.parse(stored);
  } catch {}
  return {};
}

// =====================
// Stages Configure Modal
// =====================
interface StagesConfigureModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface DbStage {
  id: string;
  name: string;
  color: string;
  dealType: string;
  orderIndex: number;
  outcome?: string | null;
}

export function StagesConfigureModal({ open, onOpenChange }: StagesConfigureModalProps) {
  const [activeDealType, setActiveDealType] = useState<DealTypeTabKey>("rentals");
  const [viewMode, setViewMode] = useState<"pipeline" | "archive">("pipeline");
  const [items, setItems] = useState<string[]>([]);
  const [groupNames, setGroupNames] = useState<Record<string, string>>({});
  const [staticGroupName, setStaticGroupName] = useState("");
  const [stageColors, setStageColors] = useState<Record<string, string>>({});
  const [dbStages, setDbStages] = useState<DbStage[]>([]);
  const [archiveDbStages, setArchiveDbStages] = useState<DbStage[]>([]);
  // Track rename history: newName → original DB stage id
  const renameMapRef = useRef<Record<string, string>>({});
  const [key, setKey] = useState(0);
  const [colorShelfOpen, setColorShelfOpen] = useState(false);
  const [colorShelfStage, setColorShelfStage] = useState<string | null>(null);
  const [colorShelfCurrent, setColorShelfCurrent] = useState<string>(PRESET_COLORS[0]);
  const [outcomeShelfOpen, setOutcomeShelfOpen] = useState(false);
  const [outcomeShelfStageId, setOutcomeShelfStageId] = useState<string | null>(null);
  const [outcomeShelfCurrent, setOutcomeShelfCurrent] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const fetchedTabRef = useRef<string | null>(null);
  const fetchedArchiveTabRef = useRef<string | null>(null);

  const tabToDbDealType: Record<DealTypeTabKey, string> = {
    rentals: "rental",
    buyers: "buyer",
    sellers: "seller",
    applications: "application",
    "tenant-rep": "tenant_rep",
  };

  const getStoragePrefix = () => viewMode === "archive" ? "door-archive-config" : "door-config";

  const isGroupId = (id: string) => id === GROUP_BLOCK_ID || id.startsWith("__group_");

  const loadItemsFromStorage = (dt: string, prefix = "door-config"): string[] => {
    try {
      const stored = localStorage.getItem(`${prefix}-items-${dt}`);
      if (stored) {
        const parsed = JSON.parse(stored) as string[];
        if (parsed.length > 0) {
          // Convert plain names → unique IDs (group IDs stay as-is)
          return parsed.map((item, i) =>
            item.startsWith("__group_") || item === GROUP_BLOCK_ID ? item : toId(item, i)
          );
        }
      }
    } catch {}
    if (prefix === "door-archive-config") return [];
    return namesToIds(loadStagesFromStorage(dt));
  };

  const loadGroupNamesFromStorage = (dt: string, prefix = "door-config"): Record<string, string> => {
    try {
      const stored = localStorage.getItem(`${prefix}-group-names-${dt}`);
      if (stored) return JSON.parse(stored);
    } catch {}
    return {};
  };

  const saveItems = (all: string[], dt: string, names?: Record<string, string>, staticName?: string) => {
    const prefix = getStoragePrefix();
    // Strip ::: suffixes before saving — stored as plain names
    const toSave = all.map(id => isGroupId(id) ? id : fromId(id));
    try {
      localStorage.setItem(`${prefix}-stages-${dt}`, JSON.stringify(toSave.filter(x => !isGroupId(x))));
      localStorage.setItem(`${prefix}-items-${dt}`, JSON.stringify(toSave));
      if (names !== undefined) localStorage.setItem(`${prefix}-group-names-${dt}`, JSON.stringify(names));
      if (staticName !== undefined) localStorage.setItem(`${prefix}-static-group-name-${dt}`, staticName);
    } catch {}
  };

  const saveColors = (c: Record<string, string>, dt: string) => {
    const prefix = getStoragePrefix();
    try { localStorage.setItem(`${prefix}-stage-colors-${dt}`, JSON.stringify(c)); } catch {}
  };

  // Reload state from storage for the given prefix
  const reloadState = (dt: string, prefix: string) => {
    setItems(loadItemsFromStorage(dt, prefix));
    setStageColors(loadStageColorsFromStorage(dt, prefix));
    if (prefix === "door-archive-config") {
      setGroupNames({});
      setStaticGroupName("");
    } else {
      setGroupNames(loadGroupNamesFromStorage(dt, prefix));
      setStaticGroupName(localStorage.getItem(`${prefix}-static-group-name-${dt}`) || "");
    }
    setKey(k => k + 1);
    setIsDirty(false);
  };

  // Fetch DB stages when modal opens or tab changes (pipeline only)
  useEffect(() => {
    if (!open || viewMode !== "pipeline") { fetchedTabRef.current = null; return; }
    if (fetchedTabRef.current === activeDealType) return;
    fetchedTabRef.current = activeDealType;

    const dbDealType = tabToDbDealType[activeDealType];
    fetch(`/api/stages?dealType=${dbDealType}&archive=false`)
      .then(res => res.ok ? res.json() : [])
      .then((stages: DbStage[]) => {
        setDbStages(stages);
        const dbColorsByName: Record<string, string> = {};
        for (const s of stages) dbColorsByName[s.name] = s.color;
        const localColors = loadStageColorsFromStorage(activeDealType, "door-config");
        setStageColors({ ...dbColorsByName, ...localColors });

        // Set items from localStorage (preserves groups) but validate against DB
        if (stages.length > 0) {
          const prefix = "door-config";
          const savedItems: string[] = (() => {
            try {
              const raw = localStorage.getItem(`${prefix}-items-${activeDealType}`);
              return raw ? JSON.parse(raw) : [];
            } catch { return []; }
          })();
          const dbNames = new Set(stages.map(s => s.name));
          if (savedItems.length > 0) {
            const filtered = savedItems.filter(id => isGroupId(id) || dbNames.has(fromId(id)));
            const presentNames = new Set(filtered.filter(id => !isGroupId(id)).map(fromId));
            const missing = stages.filter(s => !presentNames.has(s.name)).map((s, i) => toId(s.name, stages.indexOf(s)));
            setItems([...filtered, ...missing]);
          } else {
            setItems(stages.map((s, i) => toId(s.name, i)));
          }
          setKey(k => k + 1);
        }
      })
      .catch(() => {});
  }, [open, activeDealType, viewMode]);

  // Fetch DB stages when modal opens or tab changes (archive only)
  useEffect(() => {
    if (!open || viewMode !== "archive") { fetchedArchiveTabRef.current = null; return; }
    if (fetchedArchiveTabRef.current === activeDealType) return;
    fetchedArchiveTabRef.current = activeDealType;

    const dbDealType = tabToDbDealType[activeDealType];
    fetch(`/api/stages?dealType=${dbDealType}&archive=true`)
      .then(res => res.ok ? res.json() : [])
      .then((stages: DbStage[]) => {
        setArchiveDbStages(stages);
        const ids = stages.map((s, i) => toId(s.name, i));
        setItems(ids);
        const colors: Record<string, string> = {};
        stages.forEach(s => { colors[s.name] = s.color; });
        setStageColors(colors);
        setGroupNames({});
        setStaticGroupName("");
        setKey(k => k + 1);
        setIsDirty(false);
      })
      .catch(() => {});
  }, [open, activeDealType, viewMode]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const doClose = () => { setIsDirty(false); setPendingAction(null); renameMapRef.current = {}; onOpenChange(false); };
  const doTabChange = (tab: DealTypeTabKey) => {
    fetchedTabRef.current = null;
    fetchedArchiveTabRef.current = null;
    setActiveDealType(tab);
    if (viewMode === "archive") {
      // Reset — useEffect will fetch from DB
      setItems([]);
      setStageColors({});
      setGroupNames({});
      setStaticGroupName("");
      setIsDirty(false);
    } else {
      reloadState(tab, "door-config");
    }
    setPendingAction(null);
  };

  const handleSave = () => {
    if (viewMode === "pipeline") {
      // Only save group config + colors to localStorage (not stage names — DB is source of truth)
      saveItems(items, activeDealType, groupNames, staticGroupName);
      saveColors(stageColors, activeDealType);

      // Sync all changes to DB
      const stageItems = items.filter(i => !isGroupId(i));
      const pipelinePatches: Promise<unknown>[] = [];
      for (let i = 0; i < stageItems.length; i++) {
        const id = stageItems[i];
        const stageName = fromId(id);
        const color = stageColors[stageName];
        // Find DB stage by rename map first, then by name
        const dbStageId = renameMapRef.current[stageName]
        const dbStage = dbStageId
          ? dbStages.find(s => s.id === dbStageId)
          : dbStages.find(s => s.name === stageName)
        if (!dbStage) continue;
        const updates: Record<string, unknown> = {};
        if (dbStage.name !== stageName) updates.name = stageName;
        if (color && dbStage.color !== color) updates.color = color;
        if (dbStage.orderIndex !== i) updates.orderIndex = i;
        if (Object.keys(updates).length > 0) {
          pipelinePatches.push(
            fetch(`/api/stages/${dbStage.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(updates),
            })
          );
        }
      }

      Promise.all(pipelinePatches)
        .then(() => {
          renameMapRef.current = {};
          // Re-fetch DB stages to sync local state
          fetchedTabRef.current = null;
          const dbDealType = tabToDbDealType[activeDealType];
          return fetch(`/api/stages?dealType=${dbDealType}&archive=false`).then(r => r.ok ? r.json() : []);
        })
        .then((stages: DbStage[]) => {
          if (stages.length > 0) {
            setDbStages(stages);
            // Restore items from localStorage (preserves group markers) but update stage names from DB
            const prefix = "door-config";
            const savedItems: string[] = (() => {
              try {
                const raw = localStorage.getItem(`${prefix}-items-${activeDealType}`);
                return raw ? JSON.parse(raw) : [];
              } catch { return []; }
            })();
            const dbNames = new Set(stages.map(s => s.name));
            if (savedItems.length > 0) {
              // Keep group markers, filter out stages no longer in DB, add any new DB stages
              const filtered = savedItems.filter(id => isGroupId(id) || dbNames.has(fromId(id)));
              const presentNames = new Set(filtered.filter(id => !isGroupId(id)).map(fromId));
              const missing = stages.filter(s => !presentNames.has(s.name)).map((s, i) => toId(s.name, stages.indexOf(s)));
              setItems([...filtered, ...missing]);
            } else {
              setItems(stages.map((s, i) => toId(s.name, i)));
            }
            fetchedTabRef.current = activeDealType;
          }
          window.dispatchEvent(new Event("door:stages-updated"));
        })
        .catch(() => {
          window.dispatchEvent(new Event("door:stages-updated"));
        });

      // Compute and save group membership
      const markerIds = items.filter(id => isGroupId(id));
      const groupMembership: Array<{ groupId: string; groupName: string; stages: string[] }> = [];
      const firstMarkerIdx = markerIds.length > 0 ? items.indexOf(markerIds[0]) : items.length;
      const preGroupStages = items.slice(0, firstMarkerIdx).filter(id => !isGroupId(id)).map(fromId);
      groupMembership.push({ groupId: "__static_group_1__", groupName: staticGroupName || "Group 1", stages: preGroupStages });
      for (let i = 0; i < markerIds.length; i++) {
        const markerId = markerIds[i];
        const start = items.indexOf(markerId) + 1;
        const end = i + 1 < markerIds.length ? items.indexOf(markerIds[i + 1]) : items.length;
        const memberStages = items.slice(start, end).filter(id => !isGroupId(id)).map(fromId);
        groupMembership.push({ groupId: markerId, groupName: groupNames[markerId] || `Group ${i + 2}`, stages: memberStages });
      }
      try {
        localStorage.setItem(`door-config-group-membership-${activeDealType}`, JSON.stringify(groupMembership));
      } catch {}
    } else {
      // Archive mode: sync to DB
      const archivePatches: Promise<unknown>[] = [];
      const stageItems = items.filter(id => !isGroupId(id));

      for (let i = 0; i < stageItems.length; i++) {
        const id = stageItems[i];
        const name = fromId(id);
        const color = stageColors[name] || "#9ca3af";
        const dbStage = archiveDbStages.find(s => s.name === name);

        if (!dbStage) {
          // New stage — create in DB as isClosedLost=true by default
          archivePatches.push(
            fetch("/api/stages", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                dealType: tabToDbDealType[activeDealType],
                name,
                color,
                orderIndex: i,
                isClosedWon: false,
                isClosedLost: true,
              }),
            })
          );
        } else {
          // Update existing
          const updates: Record<string, unknown> = {};
          if (dbStage.name !== name) updates.name = name;
          if (dbStage.color !== color) updates.color = color;
          if (dbStage.orderIndex !== i) updates.orderIndex = i;
          if (Object.keys(updates).length > 0) {
            archivePatches.push(
              fetch(`/api/stages/${dbStage.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(updates),
              })
            );
          }
        }
      }

      if (archivePatches.length > 0) {
        Promise.all(archivePatches)
          .then(() => { fetchedArchiveTabRef.current = null; }) // trigger refetch
          .catch(() => {});
      }
    }

    setIsDirty(false);
    if (pendingAction) { pendingAction(); setPendingAction(null); }
  };

  const handleDiscard = () => {
    if (viewMode === "archive") {
      fetchedArchiveTabRef.current = null; // trigger refetch from DB
      setIsDirty(false);
    } else {
      reloadState(activeDealType, "door-config");
    }
    if (pendingAction) { pendingAction(); setPendingAction(null); }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setViewMode("pipeline");
      setActiveDealType("rentals");
      reloadState("rentals", "door-config");
      setPendingAction(null);
    } else if (isDirty) {
      setPendingAction(() => doClose);
      return;
    } else {
      onOpenChange(false);
      return;
    }
    onOpenChange(newOpen);
  };

  const handleTabChange = (tab: DealTypeTabKey) => {
    if (isDirty) {
      setPendingAction(() => () => doTabChange(tab));
      return;
    }
    doTabChange(tab);
  };

  const switchViewMode = (mode: "pipeline" | "archive") => {
    if (mode === viewMode) return;
    const doSwitch = () => {
      setViewMode(mode);
      if (mode === "archive") {
        setItems([]);
        setStageColors({});
        setGroupNames({});
        setStaticGroupName("");
        fetchedArchiveTabRef.current = null; // will trigger fetch
      } else {
        fetchedTabRef.current = null;
        reloadState(activeDealType, "door-config");
      }
      setPendingAction(null);
    };
    if (isDirty) {
      setPendingAction(() => doSwitch);
      return;
    }
    doSwitch();
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.indexOf(active.id as string);
    const newIndex = items.indexOf(over.id as string);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(items, oldIndex, newIndex);
    setItems(reordered);
    setIsDirty(true);
  };

  // id = "StageName:::index", newName = plain string
  const handleRename = (id: string, newName: string) => {
    const index = id.includes(":::") ? id.split(":::")[1] : String(items.indexOf(id));
    const newId = toId(newName, parseInt(index));
    const oldName = fromId(id);
    setItems(prev => prev.map(s => s === id ? newId : s));
    setIsDirty(true);
    // Track rename: find DB stage id for this name
    const dbStage = dbStages.find(s => s.name === oldName) || dbStages.find(s => s.name === (renameMapRef.current[oldName] ? oldName : ""))
    const originalDbId = dbStage?.id || renameMapRef.current[oldName]
    if (originalDbId) renameMapRef.current[newName] = originalDbId
    // Move color from old name to new name
    if (stageColors[oldName]) {
      const newColors = { ...stageColors, [newName]: stageColors[oldName] };
      delete newColors[oldName];
      setStageColors(newColors);
    }
  };

  const handleDelete = (id: string) => {
    const stageCount = items.filter(s => !isGroupId(s)).length;
    if (stageCount <= 1) return;
    setItems(prev => prev.filter(s => s !== id));
    setIsDirty(true);

    const name = fromId(id);
    const stageList = viewMode === "archive" ? archiveDbStages : dbStages;
    const dbStage = stageList.find(s => s.name === name);

    if (dbStage) {
      fetch(`/api/stages/${dbStage.id}`, { method: "DELETE" })
        .then(r => {
          if (!r.ok) console.warn("Could not delete stage — may be in use");
          else {
            // Remove from local dbStages state too
            if (viewMode === "archive") setArchiveDbStages(prev => prev.filter(s => s.id !== dbStage.id));
            else setDbStages(prev => prev.filter(s => s.id !== dbStage.id));
            window.dispatchEvent(new Event("door:stages-updated"));
          }
        })
        .catch(() => {});
    }
  };

  const handleAdd = () => {
    const newId = toId("New Stage", Date.now());
    setItems(prev => [...prev, newId]);
    setIsDirty(true);
  };

  const handleColorChange = (id: string, color: string) => {
    const name = fromId(id);
    setStageColors(prev => ({ ...prev, [name]: color }));
    setIsDirty(true);
  };

  const handleOpenColorShelf = (id: string, currentColor: string) => {
    setColorShelfStage(id);
    setColorShelfCurrent(currentColor);
    setColorShelfOpen(true);
  };

  const getStageColor = (idOrName: string) =>
    stageColors[fromId(idOrName)] || PRESET_COLORS[0];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[680px] p-0 overflow-visible" showCloseButton>
        <div className="flex flex-row h-[580px]">
          <div className="flex flex-col flex-1 min-w-0">
            <div className="px-6 pt-6 pb-4 shrink-0">
              <DialogHeader><DialogTitle>Configure Stages</DialogTitle></DialogHeader>
            </div>
            <div className="px-6 shrink-0">
              <div className="flex items-center gap-1 px-1 py-1 bg-muted/50 rounded-md w-fit mb-3">
                <button
                  onClick={() => switchViewMode("pipeline")}
                  className={cn("px-3 py-1 rounded text-[12px] font-medium transition-colors",
                    viewMode === "pipeline" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                >Pipeline</button>
                <button
                  onClick={() => switchViewMode("archive")}
                  className={cn("px-3 py-1 rounded text-[12px] font-medium transition-colors",
                    viewMode === "archive" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                >Archive</button>
              </div>
              <DealTypeTabs activeTab={activeDealType} onTabChange={handleTabChange} />
            </div>
            <div className="flex-1 overflow-y-auto overflow-x-hidden">
              {viewMode === "pipeline" && (
                <>
                  <p className="text-xs text-muted-foreground px-4 pt-3 pb-1">Order matters — pipeline starts at the top.</p>
                  <StaticGroupHeading name={staticGroupName} onNameChange={(v) => { setStaticGroupName(v); setIsDirty(true); }} />
                </>
              )}
              {viewMode === "archive" && (
                <p className="text-xs text-muted-foreground px-4 pt-3 pb-1">Archive stages — deals are moved here when archived.</p>
              )}
              <div className="py-2" key={key}>
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={items} strategy={verticalListSortingStrategy}>
                    {items.map((id, i) => {
                      if (isGroupId(id)) {
                        if (viewMode === "archive") return null;
                        const groupNum = items.slice(0, i + 1).filter(x => isGroupId(x)).length + 1;
                        return <SortableGroupBlock key={id} id={id} placeholder={`Group ${groupNum}`} name={groupNames[id] || ""} onNameChange={(v) => { setGroupNames(prev => ({ ...prev, [id]: v })); setIsDirty(true); }} onDelete={() => { setItems(prev => prev.filter(x => x !== id)); setGroupNames(prev => { const n = { ...prev }; delete n[id]; return n; }); setIsDirty(true); }} />;
                      }
                      const stageName = fromId(id);
                      const dbStage = (viewMode === "archive" ? archiveDbStages : dbStages).find(s => s.name === stageName);
                      const showOutcome = viewMode === "archive";
                      return (
                        <div key={id} className="flex items-center gap-1">
                          <div className="flex-1 min-w-0">
                            <SortableStageItem
                              id={id} stage={stageName}
                              color={getStageColor(id)}
                              onRename={(_, newName) => handleRename(id, newName)}
                              onDelete={() => handleDelete(id)}
                              onOpenColorShelf={(_, currentColor) => handleOpenColorShelf(id, currentColor)}
                              canDelete={items.filter(s => !isGroupId(s)).length > 1}
                            />
                          </div>
                          {showOutcome && dbStage && (
                            <button
                              type="button"
                              title={`Outcome: ${dbStage.outcome ?? "Unlabeled"}`}
                              onClick={() => {
                                setColorShelfOpen(false);
                                setOutcomeShelfStageId(dbStage.id);
                                setOutcomeShelfCurrent(dbStage.outcome ?? null);
                                setOutcomeShelfOpen(true);
                              }}
                              className={cn(
                                "shrink-0 h-7 w-7 flex items-center justify-center rounded hover:bg-accent transition-colors mr-1",
                                dbStage.outcome === "win" ? "text-green-600" :
                                dbStage.outcome === "loss" ? "text-red-500" :
                                dbStage.outcome === "na" ? "text-muted-foreground" :
                                "text-muted-foreground/40 hover:text-muted-foreground"
                              )}
                            >
                              <PieChart className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </SortableContext>
                </DndContext>
              </div>
            </div>
            <div className="shrink-0 border-t border-border">
              {isDirty && pendingAction ? (
                <div className="flex flex-col">
                  <p className="text-[12px] text-muted-foreground text-center pt-2 pb-1">Save changes?</p>
                  <div className="flex">
                    <button onClick={handleSave} className="flex-1 flex items-center justify-center py-2.5 text-[13px] text-[var(--fm-amber)] hover:text-foreground font-medium transition-colors border-r border-border">Yes</button>
                    <button onClick={handleDiscard} className="flex-1 flex items-center justify-center py-2.5 text-[13px] text-muted-foreground hover:text-foreground transition-colors">No</button>
                  </div>
                </div>
              ) : (
                <div className="flex">
                  {viewMode === "pipeline" && (
                    <button
                      onClick={() => {
                        const gc = items.filter(id => isGroupId(id)).length;
                        if (gc >= 4) return;
                        const newId = `__group_${Date.now()}__`;
                        setItems(prev => [...prev, newId]);
                        setIsDirty(true);
                      }}
                      disabled={items.filter(id => isGroupId(id)).length >= 4}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[13px] transition-colors border-r border-border",
                        items.filter(id => isGroupId(id)).length >= 4 ? "text-muted-foreground/40 cursor-not-allowed" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <Plus className="h-4 w-4" />
                      Add Group
                    </button>
                  )}
                  <button onClick={handleAdd} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[13px] text-muted-foreground hover:text-foreground transition-colors">
                    <Plus className="h-4 w-4" />
                    Add Stage
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Color Shelf */}
          <div style={{
            position: "absolute", top: 0, left: "100%",
            width: colorShelfOpen ? 220 : 0, height: "100%",
            borderLeft: colorShelfOpen ? "1px solid var(--border)" : "none",
            borderRadius: "0 12px 12px 0", background: "var(--background)",
            boxShadow: colorShelfOpen ? "4px 0 16px rgba(0,0,0,0.08)" : "none",
            transition: "width 0.25s cubic-bezier(0.4,0,0.2,1)",
            overflow: "hidden", display: "flex", flexDirection: "column", zIndex: 10,
          }}>
            <div style={{ width: 220, display: "flex", flexDirection: "column", height: "100%" }}>
              {colorShelfOpen && (
                <>
                  <div className="flex items-center justify-between px-3.5 py-3 border-b">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider truncate">
                      {colorShelfStage ? `Color: ${colorShelfStage}` : "Pick a color"}
                    </span>
                    <button onClick={() => setColorShelfOpen(false)} className="text-muted-foreground hover:text-foreground shrink-0 ml-2">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-3">
                    <div className="grid grid-cols-9 gap-1.5">
                      {PRESET_COLORS.map(presetColor => (
                        <button
                          key={presetColor}
                          type="button"
                          onClick={() => {
                            if (colorShelfStage) {
                              handleColorChange(colorShelfStage, presetColor);
                              setColorShelfCurrent(presetColor);
                            }
                          }}
                          className={cn(
                            "h-5 w-5 rounded-full cursor-pointer ring-1 ring-border hover:ring-2 hover:ring-[var(--fm-amber)] transition-all",
                            colorShelfCurrent === presetColor && "ring-2 ring-[var(--fm-amber)]"
                          )}
                          style={{ backgroundColor: presetColor }}
                        />
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
          {/* Outcome Shelf */}
          <div style={{
            position: "absolute", top: 0, left: "100%",
            width: outcomeShelfOpen ? 200 : 0, height: "100%",
            borderLeft: outcomeShelfOpen ? "1px solid var(--border)" : "none",
            borderRadius: "0 12px 12px 0", background: "var(--background)",
            boxShadow: outcomeShelfOpen ? "4px 0 16px rgba(0,0,0,0.08)" : "none",
            transition: "width 0.25s cubic-bezier(0.4,0,0.2,1)",
            overflow: "hidden", display: "flex", flexDirection: "column", zIndex: 10,
          }}>
            <div style={{ width: 200, display: "flex", flexDirection: "column", height: "100%" }}>
              {outcomeShelfOpen && (
                <>
                  <div className="flex items-center justify-between px-3.5 py-3 border-b">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Outcome</span>
                    <button onClick={() => setOutcomeShelfOpen(false)} className="text-muted-foreground hover:text-foreground">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="px-3 py-3 space-y-1.5">
                    {([
                      { value: "win", label: "Win", color: "text-green-600", bg: "hover:bg-green-500/10" },
                      { value: "loss", label: "Loss", color: "text-red-500", bg: "hover:bg-red-500/10" },
                      { value: "na", label: "Not Applicable", color: "text-muted-foreground", bg: "hover:bg-muted/50" },
                      { value: null, label: "Unlabeled", color: "text-muted-foreground/50", bg: "hover:bg-muted/30" },
                    ] as const).map(opt => (
                      <button
                        key={String(opt.value)}
                        type="button"
                        onClick={() => {
                          if (!outcomeShelfStageId) return;
                          fetch(`/api/stages/${outcomeShelfStageId}`, {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ outcome: opt.value }),
                          }).catch(() => {});
                          setArchiveDbStages(prev => prev.map(s => s.id === outcomeShelfStageId ? { ...s, outcome: opt.value } : s));
                          setOutcomeShelfCurrent(opt.value);
                          setOutcomeShelfOpen(false);
                        }}
                        className={cn(
                          "w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors",
                          opt.color, opt.bg,
                          outcomeShelfCurrent === opt.value && "bg-muted font-medium"
                        )}
                      >
                        {outcomeShelfCurrent === opt.value && <span className="text-[10px]">✓</span>}
                        {opt.label}
                      </button>
                    ))}
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
