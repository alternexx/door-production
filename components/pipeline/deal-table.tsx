"use client"

import React, { useState, useMemo, useEffect, useRef } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { StageBadge } from "./stage-badge"
import { StageDropdown } from "./stage-dropdown"
import { AgentChip, AgentChipGroup, AgentAddButton } from "./agent-chip"
import { useAgentDisplay } from "@/context/agent-display-context"
import { AgentShelf } from "./agent-shelf"
import { DealModal } from "./deal-modal"
import { ArchivedDealModal } from "./archived-deal-modal"
import { ArchiveModal } from "./archive-modal"
import { EmailModal } from "./email-modal"
import { FilterPanel, defaultFilters, type FilterState } from "./filter-panel"
import { HistoryShelf } from "./history-shelf"
import { PromoteModal } from "./promote-modal"
import { ColumnManager, loadColumnConfig } from "./column-manager"
import { BulkActions } from "./bulk-actions"
import { NotesPeekCard } from "./notes-peek-card"
import {
  ArrowUpDown,
  Search,
  Filter,
  Archive,
  Mail,
  Clock,
  Copy,
  ArrowRight,
  MoreHorizontal,
  Download,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Lock,
  LockOpen,
  Eye,
  EyeOff,
  Plus,
  RotateCcw,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { getDefaultColumnConfig, getFieldLabel, getDealTypeConfig, type ColumnConfig } from "@/lib/deal-types"
import { BOROUGHS } from "@/lib/tokens"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { motion, AnimatePresence } from "framer-motion"
import { useDealContext } from "@/lib/deal-context"
import type { DealType } from "@/db/schema"
import { CURRENT_AGENT } from "@/lib/mock-data"
import { toast } from "sonner"

const SOURCE_LABELS: Record<string, string> = {
  cold_call: "Cold Call",
  referral: "Referral",
  streeteasy: "StreetEasy",
  zillow: "Zillow",
  walk_in: "Walk-In",
  social: "Social",
  website: "Website",
  other: "Other",
}

export interface Deal {
  id: string
  primaryField: string
  borough?: string | null
  price?: string | null
  stage: string
  stageColor?: string
  stageTextColor?: string
  agents: { id: string; name: string; color: string; position?: number }[]
  notes?: string | null
  email?: string | null
  phone?: string | null
  updatedAt: string
  createdAt: string
  daysOnMarket?: number | null
  isArchived?: boolean
  /** All raw DB columns for this deal, used by edit modal to pre-populate fields */
  rawData?: Record<string, unknown>
  checklistProgress?: {
    percent: number
    completedCount: number
    totalCount: number
  } | null
  _counts?: {
    openTasks: number
    scheduledShowings: number
    comments: number
  }
}

export interface StageOption {
  name: string
  color: string
  textColor: string
}

interface Agent {
  id: string
  name: string
  color: string
}

interface DealTableProps {
  deals: Deal[]
  stages: StageOption[]
  dealType: string
  primaryFieldLabel: string
  showPrice?: boolean
  showDaysOnMarket?: boolean
  agents?: Agent[]
  currentUserId?: string
  isAdmin?: boolean
  applicationStages?: StageOption[]
  fullHeight?: boolean
}

type SortKey = "primaryField" | "stage" | "updatedAt" | "price" | "borough" | "pipeline_position" | "activity" | "move_in_date" | "days_on_market" | "stale"
type SortDir = "asc" | "desc"

export function DealTable({
  deals: initialDeals,
  stages,
  dealType,
  primaryFieldLabel,
  showPrice = false,
  showDaysOnMarket = false,
  agents = [],
  currentUserId,
  isAdmin = false,
  applicationStages = [],
  fullHeight = false,
}: DealTableProps) {
  const { mode: agentDisplayMode } = useAgentDisplay()
  const { updateDeal, removeDeal, archiveDeal, addDeal, addHistoryEntry, getStages, currentAgent, reloadDeal } = useDealContext()

  // Map v2 plural dealType string → DealType key for context calls
  const dealTypeMap: Record<string, DealType> = {
    rentals: "rental",
    sellers: "seller",
    buyers: "buyer",
    applications: "application",
    "tenant-rep": "tenant_rep",
  }
  const dealTypeKey = dealTypeMap[dealType] || (dealType as DealType)

  // Core state
  const [deals, setDeals] = useState(initialDeals)
  const [search, setSearch] = useState("")
  const [stageFilter, setStageFilter] = useState<string>("all")
  const [sortKey, setSortKey] = useState<SortKey>("updatedAt")
  const [sortDir, setSortDir] = useState<SortDir>("desc")

  // Pagination state
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(25)

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Expand state


  // Inline edit lock state
  const [unlockedRowId, setUnlockedRowId] = useState<string | null>(null)

  // Modal states
  const [dealModalOpen, setDealModalOpen] = useState(false)
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null)
  const [archiveModalOpen, setArchiveModalOpen] = useState(false)
  const [archivingDeal, setArchivingDeal] = useState<Deal | null>(null)
  const [emailModalOpen, setEmailModalOpen] = useState(false)
  const [emailDeal, setEmailDeal] = useState<Deal | null>(null)
  const [filterPanelOpen, setFilterPanelOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [historyDeal, setHistoryDeal] = useState<Deal | null>(null)
  const [agentShelfOpen, setAgentShelfOpen] = useState(false)
  const [agentShelfDealId, setAgentShelfDealId] = useState<string | null>(null)
  const [agentShelfSelectedIds, setAgentShelfSelectedIds] = useState<string[]>([])
  const [agentShelfAnchor, setAgentShelfAnchor] = useState<HTMLElement | null>(null)
  const [promoteModalOpen, setPromoteModalOpen] = useState(false)
  const [promotingDeal, setPromotingDeal] = useState<Deal | null>(null)
  const [applicationModalOpen, setApplicationModalOpen] = useState(false)
  const [applicationPrefill, setApplicationPrefill] = useState<Record<string, unknown> | null>(null)
  const [applicationAgentIds, setApplicationAgentIds] = useState<string[]>([])

  const [pendingStageChange, setPendingStageChange] = useState<{
    dealId: string
    oldStageName: string | null
    newStageName: string
    newStageId: string
    newStageColor: string
    deal: Deal
  } | null>(null)

  // Duplicate confirm state
  const [duplicateConfirmId, setDuplicateConfirmId] = useState<string | null>(null)
  const [duplicating, setDuplicating] = useState(false)

  // Delete confirm state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [unarchiveConfirmDeal, setUnarchiveConfirmDeal] = useState<Deal | null>(null)
  const [unarchiving, setUnarchiving] = useState(false)
  const [viewOnlyModal, setViewOnlyModal] = useState(false)
  const [archivedViewDeal, setArchivedViewDeal] = useState<Deal | null>(null)
  const [deletingIds, setDeletingIds] = useState<string[]>([])

  // Forward / group-boundary confirm state
  const [forwardConfirmOpen, setForwardConfirmOpen] = useState(false)
  const [groupBoundaryConfirmOpen, setGroupBoundaryConfirmOpen] = useState(false)
  const [pendingGroupInfo, setPendingGroupInfo] = useState<{ oldGroupName: string; newGroupName: string } | null>(null)
  const [pendingForwardNeedsCheck, setPendingForwardNeedsCheck] = useState(false)

  // Preference flags
  const showStageFilterPills = typeof window !== "undefined" ? localStorage.getItem("door-stage-filter-pills") !== "false" : true
  const showStageColorIndicators = typeof window !== "undefined" ? localStorage.getItem("door-stage-color-indicators") !== "false" : true
  const showStageTooltip = typeof window !== "undefined" ? localStorage.getItem("door-stage-tooltip-hover") !== "false" : true
  const confirmBackward = typeof window !== "undefined" ? localStorage.getItem("door-config-confirm-stage-backward") !== "false" : true

  // Filter state — initialize myDeals from preference
  const [filters, setFilters] = useState<FilterState>(() => {
    if (typeof window === "undefined") return defaultFilters;
    return { ...defaultFilters, myDeals: localStorage.getItem("door-my-deals-default") === "true", staleOnly: false };
  })

  // Column config
  const [columns, setColumns] = useState<ColumnConfig[]>([])

  // Notes peek state
  const [hoveredDeal, setHoveredDeal] = useState<Deal | null>(null)
  const [pinnedNoteDeal, setPinnedNoteDeal] = useState<Deal | null>(null)
  const [hoveredRowId, setHoveredRowId] = useState<string | null>(null)
  const [mouseX, setMouseX] = useState(0)
  const [mouseY, setMouseY] = useState(0)
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const tableScrollRef = useRef<HTMLDivElement | null>(null)

  const scrollTable = (dir: number) => {
    const el = tableScrollRef.current
    if (!el) return
    el.scrollLeft += dir * 300
  }
  const [notesPreviewEnabled, setNotesPreviewEnabled] = useState(true)

  // Last stage change state (keyed by deal.id)
  // Note expand state for preview (keyed by deal.id)


  useEffect(() => {
    if (typeof window === "undefined") return
    const stored = localStorage.getItem("fmdashboard_notes_preview")
    if (stored === "false") setNotesPreviewEnabled(false)
  }, [])

  // Loading states
  const [savingStage, setSavingStage] = useState<string | null>(null)

  // Initialize column config
  useEffect(() => {
    setColumns(loadColumnConfig(dealType))
  }, [dealType])

  const parseAgentId = (value: unknown): string | null => {
    if (typeof value === "string") {
      const trimmed = value.trim()
      return trimmed || null
    }
    if (typeof value === "number" && Number.isFinite(value)) return String(value)
    return null
  }

  const resolveDealAgents = (deal: Deal): Deal["agents"] => {
    if (deal.agents?.length) return deal.agents
    const raw = (deal.rawData || {}) as Record<string, unknown>
    const ids: string[] = []
    const pushId = (val: unknown) => {
      const parsed = parseAgentId(val)
      if (parsed && !ids.includes(parsed)) ids.push(parsed)
    }

    const fromArray = raw.agent_ids
    if (Array.isArray(fromArray)) {
      fromArray.forEach(pushId)
    }
    pushId(raw.agent1_id)
    pushId(raw.agent2_id)
    pushId(raw.agent3_id)

    return ids
      .map((id, i) => {
        const found = agents.find((a) => a.id === id)
        if (!found) return null
        return { id: found.id, name: found.name, color: found.color, position: i }
      })
      .filter((a): a is NonNullable<typeof a> => !!a)
  }

  // Update deals when props change
  useEffect(() => {
    setDeals(initialDeals.map((d) => ({ ...d, agents: resolveDealAgents(d) })))
  }, [initialDeals, agents])

    // Reset page when filters change
  useEffect(() => {
    setPage(1)
  }, [search, stageFilter, filters])

  const toggleSort = (key: string) => {
    const k = key as SortKey
    if (sortKey === k) {
      setSortDir(sortDir === "asc" ? "desc" : "asc")
    } else {
      setSortKey(k)
      setSortDir("asc")
    }
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === paginatedDeals.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(paginatedDeals.map((d) => d.id)))
    }
  }

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setSelectedIds(newSet)
  }

  const activeFilterCount = useMemo(() => {
    return [
      filters.agents.length > 0,
      filters.boroughs.length > 0,
      filters.stages.length > 0,
      !!filters.priceMin,
      !!filters.priceMax,
      !!filters.dateFrom,
      !!filters.dateTo,
      filters.myDeals,
      filters.archivedOnly,
      filters.flaggedOnly,
    ].filter(Boolean).length
  }, [filters])

  const filtered = useMemo(() => {
    let result = deals

    // Apply search
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(
        (d) =>
          d.primaryField?.toLowerCase().includes(q) ||
          resolveDealAgents(d).some((a) => a.name.toLowerCase().includes(q)) ||
          d.borough?.toLowerCase().includes(q)
      )
    }

    // Apply stage filter from pills
    if (stageFilter && stageFilter !== "all") {
      result = result.filter((d) => d.stage === stageFilter)
    }

    // Apply advanced filters
    if (filters.agents.length > 0) {
      result = result.filter((d) => {
        const dealAgentIds = resolveDealAgents(d).map((a) => a.id)
        return filters.agents.every((id) => dealAgentIds.includes(id))
      })
    }
    if (filters.boroughs.length > 0) {
      result = result.filter((d) => d.borough && filters.boroughs.includes(d.borough))
    }
    if (filters.stages.length > 0) {
      result = result.filter((d) => filters.stages.includes(d.stage))
    }
    if (filters.priceMin) {
      const min = parseFloat(filters.priceMin)
      result = result.filter((d) => parseFloat(d.price || "0") >= min)
    }
    if (filters.priceMax) {
      const max = parseFloat(filters.priceMax)
      result = result.filter((d) => parseFloat(d.price || "0") <= max)
    }
    if (filters.dateFrom) {
      const from = new Date(filters.dateFrom).getTime()
      result = result.filter((d) => new Date(d.updatedAt).getTime() >= from)
    }
    if (filters.dateTo) {
      const to = new Date(filters.dateTo).getTime()
      result = result.filter((d) => new Date(d.updatedAt).getTime() <= to)
    }
    if (filters.myDeals && currentUserId) {
      result = result.filter((d) => resolveDealAgents(d).some((a) => a.id === currentUserId))
    }
    if (filters.flaggedOnly) {
      const now = Date.now()
      const toMs = (v: unknown): number => {
        if (!v) return now
        if (v instanceof Date) return v.getTime()
        if (typeof v === "string") return new Date(v).getTime()
        return now
      }
      const staleDays = parseInt(localStorage.getItem("door-config-threshold-stale-days") || "7", 10)
      const stuckDays = parseInt(localStorage.getItem("door-config-threshold-stage-no-change-days") || "14", 10)
      const agentDays = parseInt(localStorage.getItem("door-config-threshold-agent-deal-days") || "30", 10)
      result = result.filter(d => {
        if (d.isArchived) return false
        const updMs = toMs((d.rawData as Record<string,unknown>)?.updatedAt) || toMs(d.updatedAt)
        const creMs = toMs((d.rawData as Record<string,unknown>)?.createdAt) || toMs(d.createdAt)
        const updDays = Math.floor((now - updMs) / 86400000)
        const creDays = Math.floor((now - creMs) / 86400000)
        if (localStorage.getItem("door-config-alert-stale-tag") !== "false" && updDays >= staleDays) return true
        if (localStorage.getItem("door-config-alert-stage-no-change") !== "false" && updDays >= stuckDays) return true
        if (localStorage.getItem("door-config-alert-agent-deal-duration") !== "false" && creDays >= agentDays && resolveDealAgents(d).length > 0) return true
        return false
      })
    }
    if (filters.archivedOnly) {
      result = result.filter((d) => d.isArchived)
    } else {
      result = result.filter((d) => !d.isArchived)
    }

    // Sort
    result = [...result].sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1
      switch (sortKey) {
        case "primaryField":
          return (a.primaryField || "").localeCompare(b.primaryField || "") * dir
        case "stage":
          return (a.stage || "").localeCompare(b.stage || "") * dir
        case "updatedAt":
          return (
            (new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()) * dir
          )
        case "price":
          return (
            (parseFloat(a.price || "0") - parseFloat(b.price || "0")) * dir
          )
        case "borough":
          return (a.borough || "").localeCompare(b.borough || "") * dir
        case "pipeline_position": {
          const aIdx = stages.findIndex(s => s.name === a.stage)
          const bIdx = stages.findIndex(s => s.name === b.stage)
          return (aIdx - bIdx) * dir
        }
        case "activity":
          return (
            (new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()) * dir
          )
        case "move_in_date": {
          const aDate = a.rawData?.move_in_date ? new Date(a.rawData.move_in_date as string).getTime() : 0
          const bDate = b.rawData?.move_in_date ? new Date(b.rawData.move_in_date as string).getTime() : 0
          return (aDate - bDate) * dir
        }
        case "days_on_market":
          return ((a.daysOnMarket || 0) - (b.daysOnMarket || 0)) * dir
        case "stale":
          return ((new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()) * dir)
        default:
          return 0
      }
    })

    // If flagged-at-top preference is on (default true), sort flagged deals to top
    const flaggedAtTop = localStorage.getItem("door-flagged-deals-top") !== "false"
    if (flaggedAtTop && !filters.archivedOnly) {
      const now = Date.now()
      const toMs = (v: unknown): number => {
        if (!v) return now
        if (v instanceof Date) return v.getTime()
        if (typeof v === "string") return new Date(v).getTime()
        return now
      }
      const staleDays = parseInt(localStorage.getItem("door-config-threshold-stale-days") || "7", 10)
      const stuckDays = parseInt(localStorage.getItem("door-config-threshold-stage-no-change-days") || "14", 10)
      const agentDays = parseInt(localStorage.getItem("door-config-threshold-agent-deal-days") || "30", 10)
      const isFlagged = (d: Deal) => {
        if (d.isArchived) return false
        const updMs = toMs((d.rawData as Record<string,unknown>)?.updatedAt) || toMs(d.updatedAt)
        const creMs = toMs((d.rawData as Record<string,unknown>)?.createdAt) || toMs(d.createdAt)
        const updDays = Math.floor((now - updMs) / 86400000)
        const creDays = Math.floor((now - creMs) / 86400000)
        const agents = (d.agents || [])
        if (localStorage.getItem("door-config-alert-stale-tag") !== "false" && updDays >= staleDays) return true
        if (localStorage.getItem("door-config-alert-stage-no-change") !== "false" && updDays >= stuckDays) return true
        if (localStorage.getItem("door-config-alert-agent-deal-duration") !== "false" && creDays >= agentDays && agents.length > 0) return true
        return false
      }
      result = [
        ...result.filter(d => isFlagged(d)),
        ...result.filter(d => !isFlagged(d)),
      ]
    }

    return result
  }, [deals, search, stageFilter, sortKey, sortDir, filters, currentUserId, agents])

  // Stage counts for pills
  const stageCounts = useMemo(() => {
    const baseDeals = filters.archivedOnly
      ? deals.filter((d) => d.isArchived)
      : deals.filter((d) => !d.isArchived)

    const counts: Record<string, number> = { all: baseDeals.length }
    stages.forEach((s) => {
      counts[s.name] = baseDeals.filter((d) => d.stage === s.name).length
    })
    return counts
  }, [deals, stages, filters.archivedOnly])

  // Pagination
  const totalPages = Math.ceil(filtered.length / perPage)
  const paginatedDeals = useMemo(() => {
    const start = (page - 1) * perPage
    return filtered.slice(start, start + perPage)
  }, [filtered, page, perPage])

  const formatRelativeTime = (dateStr: string) => {
    const d = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    const mins = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (mins < 60) return `${mins}m`
    if (hours < 24) return `${hours}h`
    if (days < 7) return `${days}d`
    if (days < 30) return `${Math.floor(days / 7)}w`
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  }

  // Context-based handlers
  const handleSaveNewDeal = async (data: Record<string, unknown>) => {
    const ctxStages = getStages(dealTypeKey)
    const firstStage = ctxStages[0]
    const newDeal = {
      id: `deal-${Date.now()}`,
      dealType: dealTypeKey,
      title: (data.primaryField as string) || (data.property as string) || (data.client as string) || (data.applicant as string) || "Untitled",
      address: (data.address as string) || "",
      unit: (data.unit as string) || null,
      borough: (data.borough as string) || "",
      neighborhood: (data.neighborhood as string) || null,
      zip: null,
      buildingId: (data.buildingId as string) || null,
      price: data.price ? Number(String(data.price).replace(/[^0-9.]/g, "")) : null,
      status: "active" as const,
      source: (data.source as string) || null,
      notes: (data.notes as string) || null,
      stageId: firstStage.id,
      leaseStartDate: null,
      leaseEndDate: null,
      listedAt: new Date(),
      archivedAt: null,
      archiveReason: null,
      showingAgentId: null,
      commissionData: null,
      createdBy: currentAgent.id,
      createdAt: new Date(),
      updatedAt: new Date(),
      stage: firstStage,
      agents: [],
      creator: currentAgent,
      clientName: (data.clientName as string) || undefined,
      clientEmail: (data.email as string) || undefined,
      clientPhone: (data.phone as string) || undefined,
    }
    addDeal(newDeal)
    toast.success("Deal created")
  }

  const handleSaveEditDeal = async (data: Record<string, unknown>) => {
    if (!editingDeal) return
    const updates: Record<string, unknown> = { ...data }
    if (data.stage) {
      const ctxStages = getStages(dealTypeKey)
      const found = ctxStages.find((s) => s.name === data.stage || s.id === data.stage)
      if (found) updates.stage = found
    }
    if (data.price !== undefined) updates.price = data.price ? Number(String(data.price).replace(/[^0-9.]/g, "")) : null
    if (data.primaryField) updates.title = data.primaryField as string
    updateDeal(dealTypeKey, editingDeal.id, updates)
    addHistoryEntry({
      id: `hist-${Date.now()}`,
      dealId: editingDeal.id,
      dealType: dealTypeKey,
      field: "edit",
      oldValue: null,
      newValue: "Deal updated via modal",
      changedById: currentAgent.id,
      changedByName: currentAgent.name,
      changedAt: new Date(),
    })
    toast.success("Deal updated")
  }

  const handleDeleteDeal = async (id: string) => {
    removeDeal(dealTypeKey, id)
    toast.success("Deal deleted")
  }

  const handleInlineSave = async (dealId: string, data: Record<string, unknown>) => {
    const updates: Record<string, unknown> = { ...data }
    if (Array.isArray(data.agent_ids)) {
      const normalizedIds = (data.agent_ids as unknown[])
        .map((id) => parseAgentId(id))
        .filter((id): id is string => id !== null)
      setDeals((prev) =>
        prev.map((deal) =>
          deal.id === dealId
            ? {
                ...deal,
                agents: normalizedIds
                  .map((id, i) => {
                    const found = agents.find((a) => a.id === id)
                    if (!found) return null
                    return { id: found.id, name: found.name, color: found.color, position: i }
                  })
                  .filter((a): a is NonNullable<typeof a> => !!a),
              }
            : deal
        )
      )
    }
    // Map primaryField keys to title
    const config = getDealTypeConfig(dealType)
    const primaryKey = config?.primaryField
    if (primaryKey && data[primaryKey] !== undefined) {
      updates.title = data[primaryKey] as string
    }
    if (data.price !== undefined) updates.price = data.price ? Number(String(data.price).replace(/[^0-9.]/g, "")) : null
    updateDeal(dealTypeKey, dealId, updates)
    const changedField = Object.keys(data)[0] || "field"
    addHistoryEntry({
      id: `hist-${Date.now()}`,
      dealId,
      dealType: dealTypeKey,
      field: changedField,
      oldValue: null,
      newValue: String(Object.values(data)[0] ?? ""),
      changedById: currentAgent.id,
      changedByName: currentAgent.name,
      changedAt: new Date(),
    })
  }

  const handleUnarchive = async (deal: Deal) => {
    setUnarchiving(true)
    try {
      // Fetch stage history for this deal
      const histRes = await fetch(`/api/deals/${deal.id}/history`)
      const histData = histRes.ok ? await histRes.json() : []

      // Get all stages to know which are archive stages
      const ctxStages = getStages(dealTypeKey)
      const archiveStageNames = new Set(
        ctxStages.filter(s => s.isClosedWon || s.isClosedLost).map(s => s.name.toLowerCase())
      )

      // Find stage changes in history, pick the last one that was NOT an archive stage
      const stageChanges = (histData as Array<{field: string; newValue: string; changedAt: string}>)
        .filter(e => e.field === "stage" && !archiveStageNames.has((e.newValue || "").toLowerCase()))
        .sort((a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime())

      const lastActiveStage = stageChanges[0]
        ? ctxStages.find(s => s.name === stageChanges[0].newValue)
        : ctxStages[0]

      const targetStage = lastActiveStage || ctxStages[0]

      const res = await fetch(`/api/deals/${deal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "active",
          archivedAt: null,
          archiveReason: null,
          ...(targetStage ? { stageId: targetStage.id } : {}),
        }),
      })
      if (res.ok) {
        updateDeal(dealTypeKey, deal.id, { status: "active", isArchived: false } as unknown as Record<string, unknown>)
        toast.success(`${deal.primaryField} unarchived`)
      } else {
        toast.error("Failed to unarchive")
      }
    } catch {
      toast.error("Failed to unarchive")
    } finally {
      setUnarchiving(false)
      setUnarchiveConfirmDeal(null)
    }
  }

  const handleArchive = async (reason: string, stageId?: string) => {
    if (!archivingDeal) return

    // Fetch archive stage details for optimistic update
    let archiveStage: { id: string; name: string; color: string } | undefined
    if (stageId) {
      try {
        const res = await fetch(`/api/stages/${stageId}`)
        if (res.ok) {
          const s = await res.json()
          archiveStage = { id: s.id, name: s.name, color: s.color }
        }
      } catch {}
    }

    archiveDeal(dealTypeKey, archivingDeal.id, reason, archiveStage)

    addHistoryEntry({
      id: `hist-${Date.now()}`,
      dealId: archivingDeal.id,
      dealType: dealTypeKey,
      field: "status",
      oldValue: "active",
      newValue: `archived (${reason})`,
      changedById: currentAgent.id,
      changedByName: currentAgent.name,
      changedAt: new Date(),
    })
    toast.success("Deal archived")
  }

  const commitStageChange = async (
    dealId: string,
    oldStageName: string | null,
    newStageObj: { id: string; name: string; color: string; isClosedWon?: boolean; isClosedLost?: boolean },
    showingScheduledAt?: string
  ) => {
    const payload: { stageId: string; showingDate?: string } = {
      stageId: newStageObj.id,
    }
    if (showingScheduledAt) {
      payload.showingDate = showingScheduledAt
    }

    const stageRes = await fetch(`/api/deals/${dealId}/stage`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    if (!stageRes.ok) {
      const data = (await stageRes.json().catch(() => ({}))) as {
        error?: string
      }
      throw new Error(data.error || "Failed to update stage")
    }

    updateDeal(dealTypeKey, dealId, {
      stage: newStageObj,
      stageId: newStageObj.id,
      showingScheduledAt: showingScheduledAt ?? null,
    } as unknown as Record<string, unknown>)
    addHistoryEntry({
      id: `hist-${Date.now()}`,
      dealId,
      dealType: dealTypeKey,
      field: "stage",
      oldValue: oldStageName,
      newValue: newStageObj.name,
      changedById: currentAgent.id,
      changedByName: currentAgent.name,
      changedAt: new Date(),
    })
  }

  const handleCancelPendingStageChange = () => {
    setForwardConfirmOpen(false)
    setGroupBoundaryConfirmOpen(false)
    setPendingGroupInfo(null)
    setPendingForwardNeedsCheck(false)
    setPendingStageChange(null)
  }

  /** After group-boundary or forward-confirm, run through remaining checks then commit. */
  const proceedAfterNewConfirms = async (skipForwardCheck = false) => {
    if (!pendingStageChange) return
    const { dealId, oldStageName, newStageName, newStageId, newStageColor, deal } = pendingStageChange

    // If forward-confirm still needs to fire (called from group-boundary confirm)
    if (!skipForwardCheck && pendingForwardNeedsCheck) {
      setPendingForwardNeedsCheck(false)
      setGroupBoundaryConfirmOpen(false)
      setPendingGroupInfo(null)
      setForwardConfirmOpen(true)
      return
    }

    // Close any open confirm dialogs
    setForwardConfirmOpen(false)
    setGroupBoundaryConfirmOpen(false)
    setPendingGroupInfo(null)
    setPendingForwardNeedsCheck(false)

    try {
      await commitStageChange(
        dealId,
        oldStageName,
        { id: newStageId, name: newStageName, color: newStageColor }
      )
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save stage")
    } finally {
      setPendingStageChange(null)
      setSavingStage(null)
    }
  }

  const handleStageChange = async (dealId: string, newStageName: string) => {
    setSavingStage(dealId)
    try {
      const ctxStages = getStages(dealTypeKey)
      const newStageObj = ctxStages.find((s) => s.name === newStageName)
      if (!newStageObj) return
      const currentDeal = deals.find((d) => d.id === dealId)
      const oldStageName = currentDeal?.stage || null
      if (!currentDeal || oldStageName === newStageName) return

      const pending = {
        dealId,
        oldStageName,
        newStageName,
        newStageId: newStageObj.id,
        newStageColor: newStageObj.color,
        deal: currentDeal,
      }

      // Read toggle values
      const confirmForward = localStorage.getItem("door-config-confirm-stage-forward") === "true"
      const confirmGroupBoundary = localStorage.getItem("door-config-confirm-group-boundary") !== "false"
      const confirmBackwardMove = localStorage.getItem("door-config-confirm-stage-backward") !== "false"

      // Determine direction
      const oldIndex = ctxStages.findIndex((s) => s.name === oldStageName)
      const newIndex = ctxStages.findIndex((s) => s.name === newStageName)
      const isForward = newIndex > oldIndex
      const isBackward = newIndex < oldIndex

      // Check group boundary crossing
      const groupMembershipRaw = localStorage.getItem(`door-config-group-membership-${dealTypeKey}`)
      const groupMembership: { groupId: string; groupName: string; stages: string[] }[] = groupMembershipRaw ? JSON.parse(groupMembershipRaw) : []
      const oldGroup = groupMembership.find((g) => g.stages.includes(oldStageName ?? ""))
      const newGroup = groupMembership.find((g) => g.stages.includes(newStageName))
      const crossingGroupBoundary = confirmGroupBoundary && groupMembership.length > 1 && !!oldGroup && !!newGroup && oldGroup.groupId !== newGroup.groupId

      // Priority: group boundary → forward confirm → existing checks → commit
      if (crossingGroupBoundary) {
        setPendingStageChange(pending)
        setPendingGroupInfo({ oldGroupName: oldGroup!.groupName, newGroupName: newGroup!.groupName })
        // If forward confirm also applies, remember to fire it after group confirm
        setPendingForwardNeedsCheck(confirmForward && isForward)
        setGroupBoundaryConfirmOpen(true)
        return
      }

      if (confirmForward && isForward) {
        setPendingStageChange(pending)
        setForwardConfirmOpen(true)
        return
      }

      if (confirmBackwardMove && isBackward) {
        setPendingStageChange(pending)
        setForwardConfirmOpen(true) // reuse forward dialog with different label
        return
      }

      await commitStageChange(
        dealId,
        oldStageName,
        { id: newStageObj.id, name: newStageObj.name, color: newStageObj.color }
      )
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save stage")
    } finally {
      setSavingStage(null)
    }
  }

  const handleDuplicate = async (deal: Deal) => {
    setDuplicating(true)
    try {
      const ctxStages = getStages(dealTypeKey)
      const stageObj = ctxStages.find((s) => s.name === deal.stage) || ctxStages[0]
      const newDeal = {
        id: `deal-${Date.now()}`,
        dealType: dealTypeKey,
        title: `${deal.primaryField} (Copy)`,
        address: (deal.rawData?.address as string) || "",
        unit: (deal.rawData?.unit as string) || null,
        borough: deal.borough || "",
        neighborhood: (deal.rawData?.neighborhood as string) || null,
        zip: null,
        buildingId: (deal.rawData?.buildingId as string) || null,
        price: deal.price ? Number(String(deal.price).replace(/[^0-9.]/g, "")) : null,
        status: "active" as const,
        source: (deal.rawData?.source as string) || null,
        notes: deal.notes || null,
        stageId: stageObj.id,
        leaseStartDate: null,
        leaseEndDate: null,
        listedAt: new Date(),
        archivedAt: null,
        archiveReason: null,
        showingAgentId: null,
        commissionData: null,
        createdBy: currentAgent.id,
        createdAt: new Date(),
        updatedAt: new Date(),
        stage: stageObj,
        agents: [],
        creator: currentAgent,
      }
      addDeal(newDeal)
      toast.success("Deal duplicated")
    } finally {
      setDuplicating(false)
      setDuplicateConfirmId(null)
    }
  }

  const handlePromote = async (data: {
    applicant: string
    address: string
    borough: string
    phone: string
    stage: string
    move_in_date: string
    notes: string
    agent_ids: string[]
    buildingId?: string | null
  }) => {
    const appStages = getStages("application")
    const firstStage = appStages[0]
    const newAppDeal = {
      id: `deal-${Date.now()}`,
      dealType: "application" as const,
      title: data.applicant,
      address: data.address,
      unit: null,
      borough: data.borough,
      neighborhood: null,
      zip: null,
      buildingId: (data.buildingId as string) || null,
      price: null,
      status: "active" as const,
      source: null,
      notes: data.notes || null,
      stageId: firstStage.id,
      leaseStartDate: null,
      leaseEndDate: null,
      listedAt: new Date(),
      archivedAt: null,
      archiveReason: null,
      showingAgentId: null,
      commissionData: null,
      createdBy: currentAgent.id,
      createdAt: new Date(),
      updatedAt: new Date(),
      stage: firstStage,
      agents: [],
      creator: currentAgent,
      clientPhone: data.phone || undefined,
    }
    addDeal(newAppDeal)
    toast.success("Promoted to Application")
  }

  const handleCreateApplicationFromStage = async (data: Record<string, unknown>) => {
    const appStages = getStages("application")
    const selectedStageName = (data.stage as string) || appStages[0]?.name
    const selectedStage = appStages.find((s) => s.name === selectedStageName) || appStages[0]
    if (!selectedStage) return

    const now = new Date()
    const applicant = (data.applicant as string) || "Applicant"
    const newAppDeal = {
      id: `deal-${Date.now()}`,
      dealType: "application" as const,
      title: applicant,
      address: (data.address as string) || "",
      unit: (data.unit as string) || null,
      borough: (data.borough as string) || "",
      neighborhood: null,
      zip: null,
      buildingId: (data.buildingId as string) || null,
      price: null,
      status: "active" as const,
      source: null,
      notes: (data.notes as string) || null,
      stageId: selectedStage.id,
      leaseStartDate: null,
      leaseEndDate: null,
      listedAt: now,
      archivedAt: null,
      archiveReason: null,
      showingAgentId: null,
      commissionData: null,
      createdBy: currentAgent.id,
      createdAt: now,
      updatedAt: now,
      stage: selectedStage,
      agents: [],
      creator: currentAgent,
      clientName: applicant,
      clientEmail: (data.email as string) || undefined,
      clientPhone: (data.phone as string) || undefined,
    }
    addDeal(newAppDeal)
    toast.success("Application draft created")
    setApplicationModalOpen(false)
    setApplicationPrefill(null)
    setApplicationAgentIds([])
  }

  // Bulk actions
  const handleBulkStageChange = async (stageName: string) => {
    const ctxStages = getStages(dealTypeKey)
    const stageObj = ctxStages.find((s) => s.name === stageName)
    if (!stageObj) return
    const ids = Array.from(selectedIds)
    ids.forEach((id) => {
      const currentDeal = deals.find((d) => d.id === id)
      updateDeal(dealTypeKey, id, { stage: stageObj, stageId: stageObj.id })
      addHistoryEntry({
        id: `hist-${Date.now()}-${id}`,
        dealId: id,
        dealType: dealTypeKey,
        field: "stage",
        oldValue: currentDeal?.stage || null,
        newValue: stageName,
        changedById: currentAgent.id,
        changedByName: currentAgent.name,
        changedAt: new Date(),
      })
    })
    setSelectedIds(new Set())
    toast.success(`${ids.length} deals updated`)
  }

  const handleBulkAssignAgent = async (agentId: string) => {
    const ids = Array.from(selectedIds)
    ids.forEach((id) => {
      updateDeal(dealTypeKey, id, { agent_ids: [agentId] } as Record<string, unknown>)
    })
    setSelectedIds(new Set())
    toast.success(`Agent assigned to ${ids.length} deals`)
  }

  const handleBulkDelete = async () => {
    deletingIds.forEach((id) => {
      removeDeal(dealTypeKey, id)
    })
    setSelectedIds(new Set())
    setDeleteConfirmOpen(false)
    setDeletingIds([])
    toast.success(`${deletingIds.length} deals deleted`)
  }

  const exportToCsv = () => {
    const selected = filtered.filter((d) => selectedIds.has(d.id))
    const data = selected.length > 0 ? selected : filtered

    const headers = [
      primaryFieldLabel,
      "Borough",
      "Agents",
      "Stage",
      "Price",
      "Email",
      "Phone",
      "Notes",
      "Updated",
    ]

    const rows = data.map((d) => [
      d.primaryField,
      d.borough || "",
      d.agents.map((a) => a.name).join("; "),
      d.stage,
      d.price || "",
      d.email || "",
      d.phone || "",
      (d.notes || "").replace(/"/g, '""'),
      new Date(d.updatedAt).toLocaleDateString(),
    ])

    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((cell) => `"${cell}"`).join(",")
      ),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = `${dealType}-export-${new Date().toISOString().split("T")[0]}.csv`
    link.click()
  }

  // Notes peek handlers
  const handleRowMouseEnter = (deal: Deal, e: React.MouseEvent) => {
    if (!deal.notes || !notesPreviewEnabled) return
    setMouseX(e.clientX)
    setMouseY(e.clientY)
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredDeal(deal)
    }, 500)
  }

  const handleRowMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
    }
    setHoveredDeal(null)
  }

  const allSelected = selectedIds.size === paginatedDeals.length && paginatedDeals.length > 0

  // Get stage color helper
  const getStageInfo = (stageName: string) => {
    const stage = stages.find((s) => s.name === stageName)
    return stage || { color: "#6b7280", textColor: "#6b7280" }
  }

  // Visible columns derived from column config
  const visibleColumns = useMemo(() => columns.filter((c) => c.visible), [columns])
  const dynamicColSpan = visibleColumns.length + 1 // +checkbox
  const notesColumnVisible = visibleColumns.some((c) => c.key === "notes")

  // Non-sortable column keys
  const nonSortableKeys = new Set(["agents", "email", "phone", "app_link", "notes", "last_edited_by", "showsheet_url"])

  // Sortable column keys — maps column key to the SortKey used for sorting
  const sortableKeys: Record<string, SortKey | null> = {
    property: "primaryField",
    client: "primaryField",
    applicant: "primaryField",
    stage: "stage",
    price: "price",
    budget: "price",
    borough: "borough",
    pipeline_position: "pipeline_position",
    activity: "activity",
    updatedAt: "updatedAt",
    move_in_date: "move_in_date",
    days_on_market: "days_on_market",
  }

  // For any column not in sortableKeys and not in nonSortableKeys, treat key as its own SortKey
  const getSortKey = (colKey: string): SortKey | null => {
    if (nonSortableKeys.has(colKey)) return null
    if (colKey in sortableKeys) return sortableKeys[colKey]
    return null
  }

  // Check if borough column is separately visible
  const boroughVisible = visibleColumns.some((c) => c.key === "borough")

  // Column header label
  const getHeaderLabel = (key: string): string => {
    if (key === "applicant" && dealType !== "applications") return "Applicant"
    if (key === "property" || key === "client" || key === "applicant") return primaryFieldLabel
    if (key === "budget") return "Budget"
    if (key === "address") return "Address"
    return getFieldLabel(dealType, key)
  }

  // Column cell renderer
  const renderCell = (key: string, deal: Deal) => {
    const resolvedAgents = resolveDealAgents(deal)

    // ── Flag computation ──────────────────────────────────────────
    const flagMessages: string[] = []
    if (!deal.isArchived && typeof window !== "undefined") {
      const now = Date.now()
      const toMs = (v: unknown): number => {
        if (!v) return now
        if (v instanceof Date) return v.getTime()
        if (typeof v === "string") return new Date(v).getTime()
        if (typeof v === "object") {
          // Date serialized as {} — try to get from string representation
          try { return new Date(String(v)).getTime() } catch { return now }
        }
        return now
      }
      // Fetch fresh timestamps directly from the API data via rawData
      // rawData is the MockDeal which has Date objects
      const updatedMs = toMs(deal.rawData?.updatedAt) || toMs(deal.updatedAt)
      const createdMs = toMs(deal.rawData?.createdAt) || toMs(deal.createdAt)
      const daysSinceMs = (ms: number) => Math.floor((now - ms) / 86400000)

      // Stale flag
      if (localStorage.getItem("door-config-alert-stale-tag") !== "false") {
        const staleDays = parseInt(localStorage.getItem("door-config-threshold-stale-days") || "7", 10)
        const d = daysSinceMs(updatedMs)
        if (d >= staleDays) flagMessages.push(`Stale — no activity for ${d}d`)
      }

      // Stage stuck flag
      if (localStorage.getItem("door-config-alert-stage-no-change") !== "false") {
        const stageStuckDays = parseInt(localStorage.getItem("door-config-threshold-stage-no-change-days") || "14", 10)
        const d = daysSinceMs(updatedMs)
        if (d >= stageStuckDays) flagMessages.push(`Stage stuck — no stage change for ${d}d`)
      }

      // Agent too long flag
      if (localStorage.getItem("door-config-alert-agent-deal-duration") !== "false") {
        const agentDealDays = parseInt(localStorage.getItem("door-config-threshold-agent-deal-days") || "30", 10)
        const d = daysSinceMs(createdMs)
        if (d >= agentDealDays && resolvedAgents.length > 0) flagMessages.push(`Agent on deal for ${d}d`)
      }
    }
    const hasFlags = flagMessages.length > 0
    // Color: use most severe (red > orange > amber)
    const flagColor = hasFlags
      ? flagMessages.some(m => m.startsWith("Agent on deal")) ? "#ef4444"
      : flagMessages.some(m => m.startsWith("Stage stuck")) ? "#f97316"
      : "#f59e0b"
      : null

    const flagIndicator = hasFlags ? (
      <span
        className="relative inline-flex items-center ml-1.5 shrink-0"
        title={flagMessages.join(" · ")}
        style={{ cursor: "default" }}
      >
        {/* Outer pulse ring */}
        <span
          className="absolute inline-flex rounded-full opacity-75 animate-ping"
          style={{ width: 8, height: 8, backgroundColor: flagColor! }}
        />
        {/* Inner solid dot */}
        <span
          className="relative inline-flex rounded-full"
          style={{ width: 8, height: 8, backgroundColor: flagColor! }}
        />
      </span>
    ) : null
    // ─────────────────────────────────────────────────────────────

    const checklistProgress = deal.checklistProgress
    const checklistBadge =
      checklistProgress && checklistProgress.totalCount > 0 ? (
        <div className="mt-1.5 max-w-[120px]">
          <div className="h-1 w-full rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-[var(--fm-amber)]"
              style={{ width: `${checklistProgress.percent}%` }}
            />
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">
            Checklist {checklistProgress.percent}%
          </div>
        </div>
      ) : null
    switch (key) {
      case "property":
      case "client": {
        const isUnlocked = unlockedRowId === deal.id
        const primaryKey = getDealTypeConfig(dealType)?.primaryField || key
        return (
          <motion.div
            key={isUnlocked ? "unlocked" : "locked"}
            animate={isUnlocked ? { x: [0, -1.5, 1.5, -1, 1, -0.5, 0.5, 0] } : { x: 0 }}
            transition={isUnlocked ? { duration: 0.4, ease: "linear", repeat: Infinity } : { duration: 0.1 }}
            className="w-full overflow-hidden"
          >
            <div className="font-medium text-[13px] leading-tight flex items-center gap-0 min-w-0">
              <span
                contentEditable={isUnlocked}
                suppressContentEditableWarning
                spellCheck={false}
                className={`truncate ${isUnlocked ? "outline-none cursor-text block w-full" : "cursor-default"}`}
                onBlur={(e) => {
                  if (!isUnlocked) return
                  const newValue = e.currentTarget.textContent || ""
                  if (newValue !== deal.primaryField) {
                    handleInlineSave(deal.id, { [primaryKey]: newValue })
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    e.currentTarget.blur()
                  } else if (e.key === "Escape") {
                    e.currentTarget.textContent = deal.primaryField
                  }
                }}
              >
                {deal.primaryField}
              </span>
              {flagIndicator}
            </div>
            {deal.borough && !boroughVisible && dealType !== "application" && (
              <div className="text-[11px] text-muted-foreground mt-0.5 truncate">
                {deal.borough}
              </div>
            )}
            {checklistBadge}
          </motion.div>
        )
      }
      case "applicant": {
        if (dealType === "applications") {
          const isUnlocked = unlockedRowId === deal.id
          const primaryKey = getDealTypeConfig(dealType)?.primaryField || key
          return (
            <motion.div
              key={isUnlocked ? "unlocked" : "locked"}
              animate={isUnlocked ? { x: [0, -1.5, 1.5, -1, 1, -0.5, 0.5, 0] } : { x: 0 }}
              transition={isUnlocked ? { duration: 0.4, ease: "linear", repeat: Infinity } : { duration: 0.1 }}
              className="w-full"
            >
              <div className="font-medium text-[13px] leading-tight flex items-center gap-0 min-w-0">
                <span
                  contentEditable={isUnlocked}
                  suppressContentEditableWarning
                  spellCheck={false}
                  className={`truncate ${isUnlocked ? "outline-none cursor-text block w-full" : "cursor-default"}`}
                  onBlur={(e) => {
                    if (!isUnlocked) return
                    const newValue = e.currentTarget.textContent || ""
                    if (newValue !== deal.primaryField) {
                      handleInlineSave(deal.id, { [primaryKey]: newValue })
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      e.currentTarget.blur()
                    } else if (e.key === "Escape") {
                      e.currentTarget.textContent = deal.primaryField
                    }
                  }}
                >
                  {deal.primaryField}
                </span>
                {flagIndicator}
              </div>
              {checklistBadge}
            </motion.div>
          )
        } else {
          return (
            <span className="text-[13px] truncate">
              {(deal.rawData?.applicant as string) || <span className="opacity-50">—</span>}
            </span>
          )
        }
      }
      case "address": {
        const isUnlocked = unlockedRowId === deal.id
        const addressVal = (deal.rawData?.address as string) || ""
        const unitVal = (deal.rawData?.unit as string) || ""
        const boroughVal = deal.borough || ""

        // Strip ", NY, USA" or ", New York, NY, USA" suffix for cleaner display
        const displayAddress = addressVal
          .replace(/, NY, USA$/i, "")
          .replace(/, New York, NY, USA$/i, "")
          .replace(/, USA$/i, "")
        const fullDisplay = unitVal ? `${displayAddress}, #${unitVal}` : displayAddress
        return (
          <motion.div
            key={isUnlocked ? "unlocked" : "locked"}
            animate={isUnlocked ? { x: [0, -1.5, 1.5, -1, 1, -0.5, 0.5, 0] } : { x: 0 }}
            transition={isUnlocked ? { duration: 0.4, ease: "linear", repeat: Infinity } : { duration: 0.1 }}
            className="w-full overflow-hidden"
          >
            <div className="flex items-center gap-0 min-w-0">
              <span
                contentEditable={isUnlocked}
                suppressContentEditableWarning
                spellCheck={false}
                className={cn("text-[13px]", isUnlocked ? "outline-none cursor-text block w-full" : "truncate cursor-default")}
                onClick={isUnlocked ? (e) => e.stopPropagation() : undefined}
                onBlur={(e) => {
                  if (!isUnlocked) return
                  const newValue = e.currentTarget.textContent || ""
                  if (newValue !== addressVal) {
                    handleInlineSave(deal.id, { address: newValue })
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    e.currentTarget.blur()
                  } else if (e.key === "Escape") {
                    e.currentTarget.textContent = fullDisplay
                  }
                }}
              >
                {fullDisplay || (!isUnlocked ? <span className="opacity-50">—</span> : null)}
              </span>
              {flagIndicator}
            </div>
            {/* Show borough below address when borough column is hidden */}
            {!boroughVisible && boroughVal && (
              <span className="text-[11px] text-muted-foreground block truncate">{boroughVal}</span>
            )}
          </motion.div>
        )
      }
      case "agents": {
        const isUnlocked = unlockedRowId === deal.id
        if (!isUnlocked) return (
          <AgentChipGroup
            agents={resolvedAgents}
            mode={agentDisplayMode}
            activeAgentIds={filters.agents}
            onAgentClick={(agentId) => {
              setFilters((prev) => ({
                ...prev,
                agents: prev.agents.includes(agentId)
                  ? prev.agents.filter((id) => id !== agentId)
                  : [...prev.agents, agentId],
              }))
            }}
          />
        )
        return (
          <motion.div
            key={isUnlocked ? "unlocked" : "locked"}
            animate={isUnlocked && !(agentShelfOpen && agentShelfDealId === deal.id) ? { x: [0, -1.5, 1.5, -1, 1, -0.5, 0.5, 0] } : { x: 0 }}
            transition={isUnlocked ? { duration: 0.4, ease: "linear", repeat: Infinity } : { duration: 0.1 }}
            className="w-full"
          >
          <div className="flex items-center flex-nowrap overflow-visible">
            {resolvedAgents.map((agent, i) => (
              <motion.div
                key={agent.id}
                className="relative"
                style={{ marginRight: "4px", position: "relative", zIndex: 1 }}
                whileHover={{ scale: 1.2, zIndex: 20 }}
                transition={{ duration: 0.15 }}
              >
                <AgentChip
                  agent={agent}
                  mode="initials"
                  onRemove={() => {
                    const newIds = resolvedAgents.filter(a => a.id !== agent.id).map(a => a.id)
                    handleInlineSave(deal.id, { agent_ids: newIds })
                  }}
                />
              </motion.div>
            ))}
            <div className="relative" ref={(el) => { if (el && agentShelfDealId === deal.id) (window as unknown as Record<string, unknown>)[`agentAddBtn_${deal.id}`] = el }}>
              <AgentAddButton onClick={(e) => {
                setAgentShelfDealId(deal.id)
                setAgentShelfSelectedIds(resolvedAgents.map(a => a.id))
                setAgentShelfOpen(prev => !prev || agentShelfDealId !== deal.id)
                setAgentShelfAnchor(e.currentTarget as HTMLElement)
              }} />
              {agentShelfOpen && agentShelfDealId === deal.id && (
                <AgentShelf
                  open={true}
                  onClose={() => {
                    handleInlineSave(deal.id, { agent_ids: agentShelfSelectedIds })
                    setTimeout(() => reloadDeal(dealTypeKey, deal.id), 800)
                    setAgentShelfOpen(false)
                    setAgentShelfDealId(null)
                  }}
                  agents={agents}
                  selectedIds={agentShelfSelectedIds}
                  onToggle={(id) => setAgentShelfSelectedIds(prev =>
                    prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
                  )}
                  anchorEl={agentShelfAnchor}
                />
              )}
            </div>
          </div>
          </motion.div>
        )
      }
      case "agent1_id":
      case "agent2_id":
      case "agent3_id": {
        const idx = key === "agent1_id" ? 0 : key === "agent2_id" ? 1 : 2
        const agent = resolvedAgents[idx]
        if (!agent) return <span className="text-muted-foreground text-xs">—</span>
        return (
          <AgentChip
            agent={agent}
            mode={agentDisplayMode}
            onClick={(agentId) => {
              setFilters((prev) => ({
                ...prev,
                agents: prev.agents.includes(agentId)
                  ? prev.agents.filter((id) => id !== agentId)
                  : [...prev.agents, agentId],
              }))
            }}
            active={filters.agents.includes(agent.id)}
          />
        )
      }
      case "borough":
        return (
          <span className="text-[13px]">
            {deal.borough || ""}
          </span>
        )
      case "price":
      case "budget": {
        const isUnlocked = unlockedRowId === deal.id
        const priceVal = deal.price || ""
        const priceKey = key === "budget" ? "budget" : "price"
        return (
          <motion.div
            key={isUnlocked ? "unlocked" : "locked"}
            animate={isUnlocked ? { x: [0, -1.5, 1.5, -1, 1, -0.5, 0.5, 0] } : { x: 0 }}
            transition={isUnlocked ? { duration: 0.4, ease: "linear", repeat: Infinity } : { duration: 0.1 }}
            className="w-full overflow-hidden"
          >
            <span
              contentEditable={isUnlocked}
              suppressContentEditableWarning
              spellCheck={false}
              className={cn("text-[13px] text-muted-foreground", isUnlocked ? "outline-none cursor-text block w-full" : "cursor-default")}
              onClick={isUnlocked ? (e) => e.stopPropagation() : undefined}
              onBlur={(e) => {
                if (!isUnlocked) return
                const newValue = e.currentTarget.textContent || ""
                if (newValue !== priceVal) {
                  handleInlineSave(deal.id, { [priceKey]: newValue })
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  e.currentTarget.blur()
                } else if (e.key === "Escape") {
                  e.currentTarget.textContent = priceVal
                }
              }}
            >
              {priceVal
                ? (() => {
                    if (isUnlocked) return priceVal
                    const showDollar = typeof window !== "undefined"
                      ? localStorage.getItem("door-price-dollar-format") !== "false"
                      : true
                    const num = parseFloat(priceVal.replace(/[^0-9.]/g, ""))
                    if (!showDollar || isNaN(num)) return priceVal
                    return "$" + num.toLocaleString("en-US")
                  })()
                : (!isUnlocked ? <span className="opacity-50">—</span> : null)}
            </span>
          </motion.div>
        )
      }
      case "stage":
        return savingStage === deal.id ? (
          <div className="flex items-center gap-2">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span className="text-xs text-muted-foreground">Saving...</span>
          </div>
        ) : (
          <div title={showStageTooltip && deal.updatedAt ? `In stage since ${new Date(deal.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : undefined}>
            <StageDropdown
              currentStage={deal.stage}
              stages={stages}
              stageColor={deal.stageColor}
              stageTextColor={deal.stageTextColor}
              onSelect={(newStage) => handleStageChange(deal.id, newStage)}
              disabled={deal.isArchived}
            />
          </div>
        )
      case "source": {
        const source = deal.rawData?.source as string | undefined
        if (!source) return <span className="opacity-50">—</span>
        return (
          <Badge variant="outline" className="text-[11px]">
            {SOURCE_LABELS[source] || source}
          </Badge>
        )
      }
      case "email": {
        const isUnlocked = unlockedRowId === deal.id
        const emailVal = deal.email || ""
        return (
          <motion.div
            key={isUnlocked ? "unlocked" : "locked"}
            animate={isUnlocked ? { x: [0, -1.5, 1.5, -1, 1, -0.5, 0.5, 0] } : { x: 0 }}
            transition={isUnlocked ? { duration: 0.4, ease: "linear", repeat: Infinity } : { duration: 0.1 }}
            className="w-full overflow-hidden"
          >
            <span
              contentEditable={isUnlocked}
              suppressContentEditableWarning
              spellCheck={false}
              className={cn("text-[11px] text-muted-foreground", isUnlocked ? "outline-none cursor-text block w-full" : "truncate cursor-default")}
              onClick={isUnlocked ? (e) => e.stopPropagation() : undefined}
              onBlur={(e) => {
                if (!isUnlocked) return
                const newValue = e.currentTarget.textContent || ""
                if (newValue !== emailVal) {
                  handleInlineSave(deal.id, { email: newValue })
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  e.currentTarget.blur()
                } else if (e.key === "Escape") {
                  e.currentTarget.textContent = emailVal
                }
              }}
            >
              {emailVal || (!isUnlocked ? <span className="opacity-50">—</span> : null)}
            </span>
          </motion.div>
        )
      }
      case "phone": {
        const isUnlocked = unlockedRowId === deal.id
        const phoneVal = deal.phone || ""
        return (
          <motion.div
            key={isUnlocked ? "unlocked" : "locked"}
            animate={isUnlocked ? { x: [0, -1.5, 1.5, -1, 1, -0.5, 0.5, 0] } : { x: 0 }}
            transition={isUnlocked ? { duration: 0.4, ease: "linear", repeat: Infinity } : { duration: 0.1 }}
            className="w-full overflow-hidden"
          >
            <span
              contentEditable={isUnlocked}
              suppressContentEditableWarning
              spellCheck={false}
              className={cn("text-[11px] text-muted-foreground", isUnlocked ? "outline-none cursor-text block w-full" : "truncate cursor-default")}
              onClick={isUnlocked ? (e) => e.stopPropagation() : undefined}
              onBlur={(e) => {
                if (!isUnlocked) return
                const newValue = e.currentTarget.textContent || ""
                if (newValue !== phoneVal) {
                  handleInlineSave(deal.id, { phone: newValue })
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  e.currentTarget.blur()
                } else if (e.key === "Escape") {
                  e.currentTarget.textContent = phoneVal
                }
              }}
            >
              {phoneVal || (!isUnlocked ? <span className="opacity-50">—</span> : null)}
            </span>
          </motion.div>
        )
      }
      case "notes": {
        const isUnlocked = unlockedRowId === deal.id
        const notesVal = deal.notes || ""
        const isLong = notesVal.length > 60
        return (
          <motion.div
            key={isUnlocked ? "unlocked" : "locked"}
            animate={isUnlocked ? { x: [0, -1.5, 1.5, -1, 1, -0.5, 0.5, 0] } : { x: 0 }}
            transition={isUnlocked ? { duration: 0.4, ease: "linear", repeat: Infinity } : { duration: 0.1 }}
            className="w-full overflow-hidden"
          >
            {isUnlocked ? (
              <div
                contentEditable
                suppressContentEditableWarning
                spellCheck={false}
                className="text-[12px] text-muted-foreground outline-none cursor-text block whitespace-pre-wrap w-full min-h-[36px] py-1"
                onClick={(e) => e.stopPropagation()}
                onBlur={(e) => {
                  const newValue = e.currentTarget.textContent || ""
                  if (newValue !== notesVal) {
                    handleInlineSave(deal.id, { notes: newValue })
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); e.currentTarget.blur() }
                  else if (e.key === "Escape") { e.currentTarget.textContent = notesVal }
                }}
              >
                {notesVal}
              </div>
            ) : (
              <div className="flex items-center gap-1 max-w-[160px]">
                <span className="text-[12px] text-muted-foreground truncate flex-1">
                  {notesVal || <span className="opacity-50">—</span>}
                </span>
                {isLong && (
                  <button
                    className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                    title="View full note"
                    onClick={(e) => {
                      e.stopPropagation()
                      setPinnedNoteDeal(deal)
                    }}
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            )}
          </motion.div>
        )
      }
      case "app_link":
        return (
          <span className="text-[12px] text-muted-foreground">
            {deal.rawData?.app_link ? "Yes" : <span className="opacity-50">—</span>}
          </span>
        )
      case "stale": {
        const showStaleTag = localStorage.getItem("door-config-alert-stale-tag") !== "false"
        if (!showStaleTag || deal.isArchived) return null
        const staleDays = parseInt((typeof window !== "undefined" ? localStorage.getItem("door-config-threshold-stale-days") : null) || "7", 10)
        const daysSince = Math.floor((Date.now() - new Date(deal.updatedAt).getTime()) / 86400000)
        if (daysSince < staleDays) return <span className="text-muted-foreground/30 text-[11px]">—</span>
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20 whitespace-nowrap">
            ⚠ {daysSince}d
          </span>
        )
      }
      case "days_on_market":
        return (
          <span className="text-[12px] text-muted-foreground">
            {deal.daysOnMarket != null ? `${deal.daysOnMarket}d` : <span className="opacity-50">—</span>}
          </span>
        )
      case "move_in_date": {
        const raw = deal.rawData?.move_in_date
        const formatted = raw ? new Date(raw as string).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : null
        return (
          <span className="text-[12px] text-muted-foreground">
            {formatted || <span className="opacity-50">—</span>}
          </span>
        )
      }
      case "pipeline_position": {
        const stageIndex = stages.findIndex(s => s.name === deal.stage)
        if (stageIndex === -1) return <span className="text-[12px] text-muted-foreground opacity-50">—</span>
        const progress = (stageIndex + 1) / stages.length
        const stageInfo = getStageInfo(deal.stage)
        return (
          <div>
            <div className="w-full max-w-[100px] h-1.5 rounded-full bg-muted">
              <div
                className="h-full rounded-full"
                style={{ width: `${progress * 100}%`, backgroundColor: stageInfo.color }}
              />
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">
              {stageIndex + 1} / {stages.length}
            </div>
          </div>
        )
      }
      case "activity": {
        const lastEditedBy = deal.rawData?.last_edited_by as string | undefined
        return (
          <div>
            <div className="text-[12px] text-foreground">{formatRelativeTime(deal.updatedAt)}</div>
            {lastEditedBy && (
              <div className="text-[10px] text-muted-foreground">{lastEditedBy}</div>
            )}
          </div>
        )
      }
      case "actions": {
        // Archived deals — no action buttons, only unarchive for admin if enabled
        if (deal.isArchived) {
          const allowUnarchive = typeof window !== "undefined"
            ? localStorage.getItem("door-config-allow-unarchive") !== "false"
            : true
          return (
            <div className="flex items-center gap-0.5">
              <button
                className="h-7 w-7 inline-flex items-center justify-center rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setArchivedViewDeal(deal)}
                title="View deal"
              >
                <Eye className="h-3.5 w-3.5" />
              </button>
              <button
                className="h-7 w-7 inline-flex items-center justify-center rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => { setHistoryDeal(deal); setHistoryOpen(true) }}
                title="History"
              >
                <Clock className="h-3.5 w-3.5" />
              </button>
              {allowUnarchive && (
                <button
                  onClick={() => setUnarchiveConfirmDeal(deal)}
                  className="h-7 w-7 inline-flex items-center justify-center rounded-md hover:bg-accent text-muted-foreground hover:text-emerald-500 transition-colors"
                  title="Unarchive"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )
        }

        return (
          <div className="flex items-center gap-0.5">
{/* Email action shelved */}
            <button
              className="h-7 w-7 inline-flex items-center justify-center rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => { setHistoryDeal(deal); setHistoryOpen(true) }}
              title="History"
            >
              <Clock className="h-3.5 w-3.5" />
            </button>
            <button
              className="h-7 w-7 inline-flex items-center justify-center rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
              onClick={(e) => { e.stopPropagation(); setUnlockedRowId(unlockedRowId === deal.id ? null : deal.id) }}
              title={unlockedRowId === deal.id ? "Lock editing" : "Unlock editing"}
            >
              {unlockedRowId === deal.id ? <LockOpen className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger className="h-7 w-7 inline-flex items-center justify-center rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
                <MoreHorizontal className="h-3.5 w-3.5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => {
                    setEditingDeal(deal)
                    setViewOnlyModal(false)
                    setDealModalOpen(true)
                  }}
                >
                  Edit
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {duplicateConfirmId === deal.id ? (
                  <DropdownMenuItem
                    onClick={() => handleDuplicate(deal)}
                    disabled={duplicating}
                  >
                    {duplicating ? (
                      <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                    ) : (
                      <Copy className="h-3.5 w-3.5 mr-2" />
                    )}
                    Confirm Duplicate?
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={() => setDuplicateConfirmId(deal.id)}>
                    <Copy className="h-3.5 w-3.5 mr-2" />
                    Duplicate
                  </DropdownMenuItem>
                )}
                {dealType === "rentals" && (
                  <DropdownMenuItem
                    onClick={() => {
                      setPromotingDeal(deal)
                      setPromoteModalOpen(true)
                    }}
                  >
                    <ArrowRight className="h-3.5 w-3.5 mr-2" />
                    Promote to Application
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    setArchivingDeal(deal)
                    setArchiveModalOpen(true)
                  }}
                  className="text-amber-600"
                >
                  <Archive className="h-3.5 w-3.5 mr-2" />
                  Archive
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )
      }
      default: {
        // showsheet_url, last_edited_by, and rentals-specific "applicant" (rawData)
        // For rentals, "applicant" appears as a non-primary column — check if this key differs from the first column
        const val = deal.rawData?.[key]
        return (
          <span className="text-[12px] text-muted-foreground truncate">
            {val != null && val !== "" ? String(val) : <span className="opacity-50">—</span>}
          </span>
        )
      }
    }
  }

  return (
    <div className={fullHeight ? "flex flex-col h-full gap-2" : "space-y-2"}>
      {/* Toolbar */}
      <div className="shrink-0 flex items-center justify-between gap-2 mb-2">
        <Button
          size="sm"
          className="h-9 bg-[var(--fm-amber)] hover:bg-[var(--fm-amber)]/90 text-white"
          onClick={() => {
            setEditingDeal(null)
            setDealModalOpen(true)
          }}
        >
          <Plus className="h-4 w-4 mr-1.5" />
          Add Deal
        </Button>

        <div className="flex items-center gap-2">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={`Search ${dealType}...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm bg-background/50"
            />
          </div>
          <Popover open={filterPanelOpen} onOpenChange={(v) => !v && setFilterPanelOpen(false)}>
            <PopoverTrigger
              className="h-9 px-3 text-xs inline-flex items-center gap-1.5 rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors font-medium"
              onClick={() => setFilterPanelOpen(true)}
            >
              <Filter className="h-3.5 w-3.5" />
              Filters
              {activeFilterCount > 0 && (
                <span className="bg-[var(--fm-amber)] text-white px-1.5 py-0.5 rounded-full text-[10px] font-medium min-w-[18px]">
                  {activeFilterCount}
                </span>
              )}
            </PopoverTrigger>
            <PopoverContent className="p-0 w-auto overflow-hidden" align="end">
              <FilterPanel
                open={filterPanelOpen}
                onClose={() => setFilterPanelOpen(false)}
                filters={filters}
                onApply={setFilters}
                stages={stages}
                agents={agents}
              />
            </PopoverContent>
          </Popover>
          <ColumnManager
            dealType={dealType}
            columns={columns}
            onChange={setColumns}
          />
          <button
            onClick={exportToCsv}
            title="Export CSV"
            className="h-9 w-9 flex items-center justify-center hover:text-foreground text-muted-foreground transition-colors"
          >
            <Download className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-0.5 border-l pl-2 ml-1">
            <button
              onClick={() => scrollTable(-1)}
              title="Scroll left"
              className="h-9 w-8 flex items-center justify-center hover:text-foreground text-muted-foreground transition-colors rounded-md hover:bg-accent"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => scrollTable(1)}
              title="Scroll right"
              className="h-9 w-8 flex items-center justify-center hover:text-foreground text-muted-foreground transition-colors rounded-md hover:bg-accent"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Stage Filter Pills — hidden when preference off */}
      {showStageFilterPills && <div className="shrink-0 flex items-center gap-1.5 overflow-x-auto pb-0.5 mb-2 scrollbar-thin">
        <button
          onClick={() => setStageFilter("all")}
          className={cn(
            "shrink-0 px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors",
            stageFilter === "all"
              ? "bg-foreground text-background"
              : "bg-muted/50 text-muted-foreground hover:bg-muted"
          )}
        >
          All
          <span className="ml-1.5 opacity-70">{stageCounts.all}</span>
        </button>
        {stages.map((stage) => (
          <button
            key={stage.name}
            onClick={() => setStageFilter(stage.name)}
            className="shrink-0 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all duration-150"
            style={stageFilter === stage.name ? {
              backgroundColor: `rgba(${parseInt(stage.color.slice(1,3),16)},${parseInt(stage.color.slice(3,5),16)},${parseInt(stage.color.slice(5,7),16)},0.2)`,
              color: stage.color,
              border: `0.5px solid rgba(${parseInt(stage.color.slice(1,3),16)},${parseInt(stage.color.slice(3,5),16)},${parseInt(stage.color.slice(5,7),16)},0.5)`,
              fontWeight: 600,
            } : {
              backgroundColor: "transparent",
              color: "var(--muted-foreground)",
              border: "0.5px solid transparent",
            }}
          >
            <span
              className="inline-block w-1.5 h-1.5 rounded-full mr-1.5"
              style={{ backgroundColor: stage.color, opacity: 0.8 }}
            />
            {stage.name}
            <span className="ml-1.5 opacity-70">{stageCounts[stage.name] || 0}</span>
          </button>
        ))}
      </div>}

      {/* Table */}
      <div className={fullHeight ? "rounded-lg border border-border/50 bg-card flex flex-col flex-1 min-h-0" : "rounded-lg border border-border/50 bg-card"}>
        <div ref={tableScrollRef} className={fullHeight ? "overflow-y-auto overflow-x-auto flex-1 min-h-0" : "overflow-auto"} style={fullHeight ? undefined : { maxHeight: "calc(100vh - 280px)" }}>
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-card">
              <TableRow className="border-b border-border/30 hover:bg-transparent">
                <TableHead className="w-[32px] px-3">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                {visibleColumns.map((col) => {
                  if (col.key === "actions") {
                    return <TableHead key={col.key} className="w-[100px]" />
                  }
                  const sk = getSortKey(col.key)
                  return (
                    <TableHead
                      key={col.key}
                      className={cn(
                        "text-[11px] uppercase tracking-[0.06em] font-medium text-muted-foreground",
                        sk && "cursor-pointer select-none"
                      )}
                      onClick={sk ? () => toggleSort(sk) : undefined}
                    >
                      {sk ? (
                        <span className="flex items-center gap-1">
                          {getHeaderLabel(col.key)}
                          <ArrowUpDown className="h-3 w-3" />
                        </span>
                      ) : (
                        getHeaderLabel(col.key)
                      )}
                    </TableHead>
                  )
                })}
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedDeals.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={dynamicColSpan}
                    className="text-center text-muted-foreground py-12"
                  >
                    No deals found
                  </TableCell>
                </TableRow>
              ) : (
                paginatedDeals.map((deal) => {
                  const stageInfo = getStageInfo(deal.stage)
                  const isRowUnlocked = unlockedRowId === deal.id
                  return (
                    <React.Fragment key={deal.id}>
                    <tr
                      className={cn(
                        "h-[52px] cursor-default border-b border-border/20 relative",
                        !isRowUnlocked && "transition-colors",
                        hoveredRowId === deal.id && !deal.isArchived && "bg-accent/30",
                        selectedIds.has(deal.id) && "bg-amber-500/10",
                        deal.isArchived && "bg-muted/40"
                      )}
                      style={{
                        borderLeft: showStageColorIndicators ? `3px solid ${deal.isArchived ? "#9ca3af" : stageInfo.color}` : "3px solid transparent",

                      }}
                      onClick={(e) => {
                        // Row click does nothing — lock is in actions
                        if (unlockedRowId && unlockedRowId !== deal.id) {
                          setUnlockedRowId(null)
                        }
                      }}
                      onMouseEnter={(e) => { setHoveredRowId(deal.id); handleRowMouseEnter(deal, e) }}
                      onMouseLeave={() => { setHoveredRowId(null); handleRowMouseLeave() }}
                    >
                      <TableCell className="px-2" data-no-row-click onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedIds.has(deal.id)}
                          onCheckedChange={() => toggleSelect(deal.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </TableCell>

                      {visibleColumns.map((col) => (
                        <TableCell
                          key={col.key}
                          className="py-1"
                          data-no-row-click={col.key === "stage" || col.key === "actions" ? true : undefined}
                          onClick={col.key === "stage" || col.key === "actions" ? (e) => e.stopPropagation() : undefined}
                        >
                          {renderCell(col.key, deal)}
                        </TableCell>
                      ))}
                    </tr>
                    {/* Expand row — on backburner, disabled */}
                    </React.Fragment>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {filtered.length > 25 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border/30 bg-muted/30">
            <div className="text-xs text-muted-foreground">
              Showing {(page - 1) * perPage + 1}–{Math.min(page * perPage, filtered.length)} of {filtered.length} deals
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="h-7 w-7 inline-flex items-center justify-center rounded-md hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number
                  if (totalPages <= 5) {
                    pageNum = i + 1
                  } else if (page <= 3) {
                    pageNum = i + 1
                  } else if (page >= totalPages - 2) {
                    pageNum = totalPages - 4 + i
                  } else {
                    pageNum = page - 2 + i
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={cn(
                        "h-7 min-w-[28px] px-2 text-xs rounded-md transition-colors",
                        page === pageNum
                          ? "bg-foreground text-background"
                          : "hover:bg-accent text-muted-foreground"
                      )}
                    >
                      {pageNum}
                    </button>
                  )
                })}
                {totalPages > 5 && page < totalPages - 2 && (
                  <>
                    <span className="text-muted-foreground">...</span>
                    <button
                      onClick={() => setPage(totalPages)}
                      className="h-7 min-w-[28px] px-2 text-xs rounded-md hover:bg-accent text-muted-foreground"
                    >
                      {totalPages}
                    </button>
                  </>
                )}
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="h-7 w-7 inline-flex items-center justify-center rounded-md hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
              <div className="flex items-center gap-1.5 ml-4">
                <span className="text-xs text-muted-foreground">Per page:</span>
                {[25, 50, 100].map((n) => (
                  <button
                    key={n}
                    onClick={() => {
                      setPerPage(n)
                      setPage(1)
                    }}
                    className={cn(
                      "h-7 px-2 text-xs rounded-md transition-colors",
                      perPage === n
                        ? "bg-foreground text-background"
                        : "hover:bg-accent text-muted-foreground"
                    )}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Notes Peek Card */}
      {notesPreviewEnabled && (
        <NotesPeekCard
          deal={hoveredDeal}
          mouseX={mouseX}
          mouseY={mouseY}
          visible={!!hoveredDeal}
        />
      )}

      {/* Pinned Note Modal (eye button) */}
      {pinnedNoteDeal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center" onClick={() => setPinnedNoteDeal(null)}>
          <div className="absolute inset-0 bg-black/30" />
          <div
            className="relative bg-card border border-border rounded-xl shadow-2xl p-5 w-[480px] max-w-[90vw] max-h-[70vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 mb-3 shrink-0">
              <div>
                <h4 className="text-sm font-medium">{pinnedNoteDeal.primaryField}</h4>
                {pinnedNoteDeal.borough && <p className="text-xs text-muted-foreground">{pinnedNoteDeal.borough}</p>}
              </div>
              <button onClick={() => setPinnedNoteDeal(null)} className="text-muted-foreground hover:text-foreground shrink-0">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1">
              <p className="text-sm whitespace-pre-wrap leading-relaxed text-foreground">{pinnedNoteDeal.notes}</p>
            </div>
          </div>
        </div>
      )}

      {/* Deal Modal (Create/Edit) */}
      <DealModal
        open={dealModalOpen}
        onClose={() => {
          setDealModalOpen(false)
          setEditingDeal(null)
          setViewOnlyModal(false)
        }}
        viewOnly={viewOnlyModal}
        dealType={dealType}
        deal={editingDeal}
        agents={agents}
        stages={stages}
        onSave={editingDeal ? handleSaveEditDeal : handleSaveNewDeal}
        onDelete={editingDeal ? handleDeleteDeal : undefined}
        onOpenHistoryShelf={editingDeal ? () => {
          setHistoryDeal(editingDeal)
          setHistoryOpen(true)
        } : undefined}
        isAdmin={isAdmin}
      />

      <DealModal
        open={applicationModalOpen}
        onClose={() => {
          setApplicationModalOpen(false)
          setApplicationPrefill(null)
          setApplicationAgentIds([])
        }}
        dealType="applications"
        deal={null}
        agents={agents}
        stages={applicationStages}
        initialValues={applicationPrefill || undefined}
        initialAgentIds={applicationAgentIds}
        onSave={handleCreateApplicationFromStage}
      />

      {/* Archive Modal */}
      <ArchiveModal
        open={archiveModalOpen}
        onClose={() => {
          setArchiveModalOpen(false)
          setArchivingDeal(null)
        }}
        dealType={dealType}
        dealName={archivingDeal?.primaryField || ""}
        onConfirm={(reason, stageId) => handleArchive(reason, stageId)}
      />

      {/* Email Modal */}
      <EmailModal
        open={emailModalOpen}
        onClose={() => {
          setEmailModalOpen(false)
          setEmailDeal(null)
        }}
        recipients={
          emailDeal
            ? [{ name: emailDeal.primaryField, email: emailDeal.email || "" }]
            : []
        }
      />

      {/* History Shelf */}
      <HistoryShelf
        open={historyOpen}
        onClose={() => {
          setHistoryOpen(false)
          setHistoryDeal(null)
        }}
        dealType={dealType}
        dealId={historyDeal?.id || ""}
        dealName={historyDeal?.primaryField || ""}
      />

      {/* Promote Modal */}
      <PromoteModal
        open={promoteModalOpen}
        onClose={() => {
          setPromoteModalOpen(false)
          setPromotingDeal(null)
        }}
        rentalProperty={promotingDeal?.primaryField || ""}
        rentalBorough={promotingDeal?.borough}
        onPromote={async (data) => {
          await handlePromote({
            applicant: data.applicant,
            address: promotingDeal?.primaryField || "",
            borough: promotingDeal?.borough || "",
            phone: data.phone || "",
            stage: applicationStages[0]?.name || "Application in Process",
            move_in_date: data.moveInDate || "",
            notes: data.notes || "",
            agent_ids: promotingDeal?.agents.map((a) => a.id) || [],
          })
        }}
      />

      {/* Bulk Actions Bar */}
      <BulkActions
        selectedCount={selectedIds.size}
        onClear={() => setSelectedIds(new Set())}
        stages={stages}
        agents={agents}
        onChangeStage={handleBulkStageChange}
        onAssignAgent={handleBulkAssignAgent}
        onExportCsv={exportToCsv}
        onDelete={
          isAdmin
            ? () => {
                setDeletingIds(Array.from(selectedIds))
                setDeleteConfirmOpen(true)
              }
            : undefined
        }
        isAdmin={isAdmin}
      />

      {/* Archived Deal View Modal */}
      <ArchivedDealModal
        open={!!archivedViewDeal}
        onClose={() => setArchivedViewDeal(null)}
        deal={archivedViewDeal}
        dealType={dealType}
      />

      {/* Unarchive Confirm Modal */}
      {unarchiveConfirmDeal && (() => {
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40" onClick={() => setUnarchiveConfirmDeal(null)} />
            <div className="relative bg-background border border-border rounded-xl shadow-xl p-6 w-[380px] space-y-4">
              <div className="flex items-center gap-2">
                <RotateCcw className="h-4 w-4 text-emerald-500 shrink-0" />
                <h3 className="text-[15px] font-semibold">Unarchive deal?</h3>
              </div>
              <p className="text-[13px] text-muted-foreground">
                <span className="font-medium text-foreground">{unarchiveConfirmDeal.primaryField}</span> will be unarchived and returned to its last active pipeline stage.
              </p>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  onClick={() => setUnarchiveConfirmDeal(null)}
                  className="px-4 py-2 text-[13px] rounded-md border border-border hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleUnarchive(unarchiveConfirmDeal)}
                  disabled={unarchiving}
                  className="px-4 py-2 text-[13px] rounded-md bg-emerald-500 hover:bg-emerald-600 text-white font-medium transition-colors disabled:opacity-50 flex items-center gap-1.5"
                >
                  {unarchiving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Unarchive
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deletingIds.length} deals?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. All selected deals will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Forward Confirm Dialog */}
      <AlertDialog open={forwardConfirmOpen} onOpenChange={(open) => { if (!open) handleCancelPendingStageChange() }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {(() => {
                if (!pendingStageChange) return "Move Deal?";
                const ctxStages = getStages(dealTypeKey);
                const oldIdx = ctxStages.findIndex(s => s.name === pendingStageChange.oldStageName);
                const newIdx = ctxStages.findIndex(s => s.name === pendingStageChange.newStageName);
                return newIdx < oldIdx ? "Move Deal Backward?" : "Move Deal Forward?";
              })()}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Move this deal to <strong>{pendingStageChange?.newStageName}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelPendingStageChange}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => proceedAfterNewConfirms(true)}
              className="bg-amber-600 text-white hover:bg-amber-700"
            >
              Move
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Group Boundary Confirm Dialog */}
      <AlertDialog open={groupBoundaryConfirmOpen} onOpenChange={(open) => { if (!open) handleCancelPendingStageChange() }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cross Group Boundary?</AlertDialogTitle>
            <AlertDialogDescription>
              This will move the deal from <strong>{pendingGroupInfo?.oldGroupName}</strong> to <strong>{pendingGroupInfo?.newGroupName}</strong>. Continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelPendingStageChange}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => proceedAfterNewConfirms(false)}
              className="bg-amber-600 text-white hover:bg-amber-700"
            >
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  )
}
