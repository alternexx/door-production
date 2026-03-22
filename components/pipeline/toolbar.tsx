"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Search, Filter, Columns3, Archive } from "lucide-react";
import type { AppStage, AppAgent } from "@/lib/mock-data";
import type { ColumnConfig } from "@/lib/types";
import { BOROUGHS, SOURCES } from "@/lib/types";

interface ToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  stages: AppStage[];
  users: AppAgent[];
  filters: Record<string, string>;
  onFiltersChange: (filters: Record<string, string>) => void;
  columns: ColumnConfig[];
  onColumnsChange: (columns: ColumnConfig[]) => void;
  showArchived: boolean;
  onShowArchivedChange: (show: boolean) => void;
}

export function Toolbar({
  search,
  onSearchChange,
  stages,
  users,
  filters,
  onFiltersChange,
  columns,
  onColumnsChange,
  showArchived,
  onShowArchivedChange,
}: ToolbarProps) {
  const activeStages = stages.filter((s) => !s.isClosedWon && !s.isClosedLost);

  const setFilter = (key: string, value: string) => {
    const next = { ...filters };
    if (value === "all") {
      delete next[key];
    } else {
      next[key] = value;
    }
    onFiltersChange(next);
  };

  const toggleColumn = (id: string) => {
    if (id === "title") return;
    onColumnsChange(
      columns.map((c) => (c.id === id ? { ...c, visible: !c.visible } : c))
    );
  };

  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search deals..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      <Popover>
        <PopoverTrigger className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium border border-border bg-card hover:bg-muted h-8 px-3 cursor-pointer text-foreground">
          <Filter className="h-4 w-4" />
          Filter
          {Object.keys(filters).length > 0 && (
            <span className="ml-1 rounded-full bg-[var(--fm-amber)] text-white text-[10px] px-1.5 py-0.5">
              {Object.keys(filters).length}
            </span>
          )}
        </PopoverTrigger>
        <PopoverContent className="w-72" align="start">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">Stage</Label>
              <Select
                onValueChange={(v: string | null) => v && setFilter("stageId", v)}
                value={filters.stageId ?? "all"}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stages</SelectItem>
                  {activeStages.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">Borough</Label>
              <Select
                onValueChange={(v: string | null) => v && setFilter("borough", v)}
                value={filters.borough ?? "all"}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Boroughs</SelectItem>
                  {BOROUGHS.map((b) => (
                    <SelectItem key={b} value={b}>
                      {b}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">Agent</Label>
              <Select
                onValueChange={(v: string | null) => v && setFilter("agentId", v)}
                value={filters.agentId ?? "all"}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Agents</SelectItem>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">Source</Label>
              <Select
                onValueChange={(v: string | null) => v && setFilter("source", v)}
                value={filters.source ?? "all"}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  {SOURCES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {Object.keys(filters).length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs"
                onClick={() => onFiltersChange({})}
              >
                Clear All Filters
              </Button>
            )}
          </div>
        </PopoverContent>
      </Popover>

      <Popover>
        <PopoverTrigger className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium border border-border bg-card hover:bg-muted h-8 px-3 cursor-pointer text-foreground">
          <Columns3 className="h-4 w-4" />
          Columns
        </PopoverTrigger>
        <PopoverContent className="w-56" align="end">
          <div className="space-y-2">
            {columns
              .filter((c) => c.id !== "select")
              .map((col) => (
                <div key={col.id} className="flex items-center gap-2">
                  <Checkbox
                    id={col.id}
                    checked={col.visible}
                    disabled={col.id === "title"}
                    onCheckedChange={() => toggleColumn(col.id)}
                  />
                  <Label
                    htmlFor={col.id}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {col.label}
                  </Label>
                </div>
              ))}
          </div>
        </PopoverContent>
      </Popover>

      <button
        onClick={() => onShowArchivedChange(!showArchived)}
        className={`inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium border h-8 px-3 cursor-pointer transition-colors ${
          showArchived
            ? "bg-[var(--fm-amber)] text-white border-[var(--fm-amber)]"
            : "border-border bg-card hover:bg-muted text-muted-foreground"
        }`}
      >
        <Archive className="h-4 w-4" />
        {showArchived ? "Show Active" : "View Archived"}
      </button>
    </div>
  );
}
