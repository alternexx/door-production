"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AddressAutocomplete } from "@/components/ui/address-autocomplete"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AgentChip } from "./agent-chip"

import { ShowingList, ShowingScheduleShelf, ShowingDetailShelf, type Showing } from "./showing-list"
import { TaskList, TaskAddShelf, TaskDetailShelf, type Task } from "./task-list"
import { useIsMobile } from "@/hooks/use-media-query"
import { getDealTypeConfig, type FieldConfig } from "@/lib/deal-types"
import { BOROUGHS } from "@/lib/tokens"
import { toast } from "sonner"
import { Users, X, Loader2, ChevronRight, SendHorizonal, CalendarIcon } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { format, parse } from "date-fns"
import { useDealContext } from "@/lib/deal-context"
import type { Deal, StageOption } from "./deal-table"

interface Agent {
  id: string
  name: string
  color: string
}

interface DealModalProps {
  open: boolean
  onClose: () => void
  onOpenHistoryShelf?: () => void
  dealType: string
  deal?: Deal | null
  agents: Agent[]
  stages: StageOption[]
  initialValues?: Record<string, unknown>
  initialAgentIds?: string[]
  onSave: (data: Record<string, unknown>) => Promise<void>
  onDelete?: (id: string) => Promise<void>
  viewOnly?: boolean
  isAdmin?: boolean
}

interface BuildingOption {
  id: string
  address: string
  borough: string
  neighborhood?: string | null
}

export function DealModal({
  open,
  onClose,
  onOpenHistoryShelf,
  viewOnly = false,
  dealType,
  deal,
  agents,
  stages,
  initialValues,
  initialAgentIds,
  onSave,
  onDelete,
  isAdmin = false,
}: DealModalProps) {
  const { currentAgent } = useDealContext()
  const CURRENT_AGENT_ID = "f8cc0af6-7aaa-47ee-90d7-f10ce5c2bb44"
  const isMobile = useIsMobile()
  const config = getDealTypeConfig(dealType)
  const isEdit = !!deal

  const [form, setForm] = useState<Record<string, unknown>>({})
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>([])
  const [agentPanelOpen, setAgentPanelOpen] = useState(false)
  const [stageShelfOpen, setStageShelfOpen] = useState(false)
  const [showingShelfOpen, setShowingShelfOpen] = useState(false)
  const [stageHistoryShelfOpen, setStageHistoryShelfOpen] = useState(false)
  const [taskAddShelfOpen, setTaskAddShelfOpen] = useState(false)
  const [taskAddTitle, setTaskAddTitle] = useState("")
  const [taskAddDescription, setTaskAddDescription] = useState("")
  const [taskAddDueDate, setTaskAddDueDate] = useState("")
  const [taskAddPriority, setTaskAddPriority] = useState("medium")
  const [taskAddSaving, setTaskAddSaving] = useState(false)
  const [taskRefreshKey, setTaskRefreshKey] = useState(0)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [taskCompleting, setTaskCompleting] = useState(false)
  const [taskArchiving, setTaskArchiving] = useState(false)
  const [showingScheduleDate, setShowingScheduleDate] = useState("")
  const [showingType, setShowingType] = useState<"private" | "open_house">("private")

  const [showingSaving, setShowingSaving] = useState(false)
  const [showingAtMax, setShowingAtMax] = useState(false)
  const [showingRefreshKey, setShowingRefreshKey] = useState(0)
  const [selectedShowing, setSelectedShowing] = useState<Showing | null>(null)
  const [showingArchiving, setShowingArchiving] = useState(false)
  const [agentSearch, setAgentSearch] = useState("")
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [initialForm, setInitialForm] = useState<Record<string, unknown>>({})
  const [initialAgents, setInitialAgents] = useState<string[]>([])
  const [buildings, setBuildings] = useState<BuildingOption[]>([])
  const [showAddBuildingPrompt, setShowAddBuildingPrompt] = useState(false)
  const [promptAddress, setPromptAddress] = useState("")
  const [buildingCreateOpen, setBuildingCreateOpen] = useState(false)
  const [buildingCreateSaving, setBuildingCreateSaving] = useState(false)
  const [buildingCreateAddress, setBuildingCreateAddress] = useState("")
  const [buildingCreateBorough, setBuildingCreateBorough] = useState("")
  const [buildingCreateNeighborhood, setBuildingCreateNeighborhood] = useState("")
  const [declinedBuildingAddresses, setDeclinedBuildingAddresses] = useState<string[]>([])
  const [suggestedBuilding, setSuggestedBuilding] = useState<BuildingOption | null>(null)
  const [addressFromPlaces, setAddressFromPlaces] = useState(false)
  const [topPlacesSuggestion, setTopPlacesSuggestion] = useState<{ description: string; placeId: string } | null>(null)
  const [stageTimeline, setStageTimeline] = useState<Array<{
    id: string
    stageName: string
    enteredAt: string
    durationSeconds: number | null
    stage?: { color?: string | null } | null
    changedByUser?: { name?: string | null } | null
  }>>([])
  const [dealHistory, setDealHistory] = useState<Array<{
    id: string; field: string; oldValue: string | null; newValue: string | null; changedByName: string | null; changedAt: string;
  }>>([])
  const [fullHistoryShelfOpen, setFullHistoryShelfOpen] = useState(false)
  const [fullHistoryTab, setFullHistoryTab] = useState("all")
  const [fullHistoryShowings, setFullHistoryShowings] = useState<Array<{id:string;scheduledAt:string;status:string;showingType:string;agent:{name:string}}>>([])
  const [fullHistoryTasks, setFullHistoryTasks] = useState<Array<{id:string;title:string;status:string;priority:string;dueDate:string|null;completedAt:string|null;createdAt:string;creator:{name:string}|null}>>([])
  const [fullHistoryLoading, setFullHistoryLoading] = useState(false)
  const [comments, setComments] = useState<Array<{
    id: string; content: string; authorName: string; createdAt: string;
  }>>([])
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [commentText, setCommentText] = useState("")
  const [commentSaving, setCommentSaving] = useState(false)
  const [commentsShelfOpen, setCommentsShelfOpen] = useState(false)
  const [lastSeenCommentTs, setLastSeenCommentTs] = useState<string | null>(null)

  const closeAllShelves = () => {
    setAgentPanelOpen(false)
    setStageShelfOpen(false)
    setShowingShelfOpen(false)
    setSelectedShowing(null)
    setStageHistoryShelfOpen(false)
    setTaskAddShelfOpen(false)
    setSelectedTask(null)
    setCommentsShelfOpen(false)
    setFullHistoryShelfOpen(false)
  }

  const openCommentsShelf = () => {
    closeAllShelves()
    setCommentsShelfOpen(true)
    // Mark all as seen
    if (deal?.id && comments.length > 0) {
      const latest = comments[0].createdAt
      localStorage.setItem(`door-comments-seen-${deal.id}`, latest)
      setLastSeenCommentTs(latest)
    }
  }

  // Initialize form
  useEffect(() => {
    if (!open) return
    if (deal) {
      const raw = (deal.rawData || {}) as Record<string, unknown>
      const initial: Record<string, unknown> = {}
      config?.fields.forEach((field) => {
        if (field.type === "agent") return
        const key = field.key
        // Map from deal object - prefer rawData for deal-type-specific fields
        if (key === "property" || key === "client" || key === "applicant") {
          initial[key] = raw[key] ?? deal.primaryField ?? ""
        } else if (key === "budget") {
          initial[key] = raw[key] ?? deal.price ?? ""
        } else if (key in raw) {
          initial[key] = raw[key] ?? ""
        } else if (key in deal) {
          initial[key] = (deal as unknown as Record<string, unknown>)[key] ?? ""
        } else {
          initial[key] = ""
        }
      })
      initial.stage = deal.stage
      initial.buildingId = (raw.buildingId as string) ?? ""
      initial.borough = raw.borough ?? deal.borough ?? ""
      initial.notes = raw.notes ?? deal.notes ?? ""
      initial.email = raw.email ?? deal.email ?? ""
      initial.phone = raw.phone ?? deal.phone ?? ""
      initial.price = raw.price ?? deal.price ?? ""
      setForm(initial)
      setInitialForm({ ...initial })
      const initAgents = deal.agents.map((a) => a.id)
      setSelectedAgentIds(initAgents)
      setInitialAgents(initAgents)
    } else {
      const initial: Record<string, unknown> = {}
      config?.fields.forEach((field) => {
        if (field.type === "agent") return
        if (field.type === "boolean") {
          initial[field.key] = false
        } else {
          initial[field.key] = ""
        }
      })
      if (stages.length > 0) initial.stage = stages[0].name
      initial.buildingId = ""
      if (initialValues) {
        Object.assign(initial, initialValues)
      }
      setForm(initial)
      setInitialForm({ ...initial })
      setInitialAgents(initialAgentIds || [])
      setSelectedAgentIds(initialAgentIds || [])
    }
    setDeleteConfirm(false)
    setIsDirty(false)
    closeAllShelves()
    setAgentSearch("")
    setShowAddBuildingPrompt(false)
    setPromptAddress("")
    setBuildingCreateOpen(false)
    setBuildingCreateSaving(false)
    setBuildingCreateAddress("")
    setBuildingCreateBorough("")
    setBuildingCreateNeighborhood("")
    setDeclinedBuildingAddresses([])
    setSuggestedBuilding(null)
    setAddressFromPlaces(false)
    setTopPlacesSuggestion(null)
  }, [open, deal, dealType, initialValues, initialAgentIds, stages])

  useEffect(() => {
    if (!open) return
    fetch("/api/buildings")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (Array.isArray(data)) {
          setBuildings(data as BuildingOption[])
        } else {
          setBuildings([])
        }
      })
      .catch(() => setBuildings([]))
  }, [open])

  const DIRTY_FIELDS = new Set(["stage", "notes", "address", "unit", "price", "email", "phone"])

  const setField = useCallback((key: string, value: unknown) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    if (isEdit && DIRTY_FIELDS.has(key)) {
      // Only dirty if value actually changed from initial
      const initial = initialForm[key]
      const normalize = (v: unknown) => (v === null || v === undefined) ? "" : String(v).trim()
      if (normalize(value) !== normalize(initial)) {
        setIsDirty(true)
      }
    }
  }, [isEdit, initialForm])

  const normalizeAddress = useCallback((address: string) => {
    return address.trim().toLowerCase().replace(/\s+/g, " ")
  }, [])

  // Strip borough names, "New York", state, and zip from address - keep neighborhood
  const stripBoroughFromAddress = useCallback((address: string): string => {
    const patterns = [
      // Borough/city + optional state + optional zip anywhere trailing
      /,?\s*(Brooklyn|Queens|Bronx|Staten Island|Manhattan|New York)\s*,?\s*(NY|New York)?\s*,?\s*\d{0,5}\s*$/i,
      // State + zip
      /,?\s*(NY|New York)\s*,?\s*\d{5}\s*$/i,
      // Zip only
      /,?\s*\d{5}\s*$/,
      // Any remaining borough/city names still in the string (e.g. mid-address after neighborhood)
      /,\s*(Brooklyn|Queens|Bronx|Staten Island|Manhattan|New York)\s*(?=,|$)/gi,
    ]
    let result = address
    for (const pattern of patterns) {
      result = result.replace(pattern, "").trim().replace(/,\s*$/, "").trim()
    }
    return result
  }, [])

  // Extract unit from address string, return { base, unit }
  // Matches: "Apt #3B", "Apt 3B", "Unit 4D", "#2R", "2F", "3A" at end, etc.
  const parseAddressUnit = useCallback((address: string): { base: string; unit: string | null } => {
    const patterns = [
      // Apt #3B / Apt 3B / Apartment #3B
      /,?\s*(?:Apt\.?|Apartment|Unit|Ste\.?|Suite|#)\s*#?\s*([A-Za-z0-9][-A-Za-z0-9]*)\s*$/i,
      // Standalone #3B at end
      /,?\s*#\s*([A-Za-z0-9][-A-Za-z0-9]*)\s*$/i,
      // Trailing unit like "3B" or "2F" or "1R" after a space
      /\s+([0-9]+[A-Za-z]|[A-Za-z][0-9]+[A-Za-z]?)\s*$/,
    ]
    for (const pattern of patterns) {
      const match = address.match(pattern)
      if (match) {
        const unit = match[1].trim()
        const base = address.slice(0, match.index).trim().replace(/,\s*$/, "")
        return { base, unit }
      }
    }
    return { base: address, unit: null }
  }, [])

  const handleClose = useCallback(async () => {
    if (isEdit && isDirty) {
      const payload: Record<string, unknown> = { ...form, agent_ids: selectedAgentIds }
      if (payload.source === "") payload.source = null
      try { await onSave(payload) } catch { /* silent */ }
    }
    onClose()
  }, [isEdit, isDirty, form, selectedAgentIds, onSave, onClose])


  const handleAddressCommitted = useCallback(
    (address: string) => {
      const trimmed = address.trim()
      if (!trimmed) {
        setShowAddBuildingPrompt(false)
        setBuildingCreateOpen(false)
        setPromptAddress("")
        setField("buildingId", null)
        return
      }

      // Auto-extract unit from address, then strip borough/city/state suffix
      const { base, unit } = parseAddressUnit(trimmed)
      const finalAddress = stripBoroughFromAddress(base || trimmed)
      if (unit && !form.unit) setField("unit", unit)
      if (finalAddress !== trimmed) setField("address", finalAddress)

      const normalized = normalizeAddress(finalAddress)
      const matchedBuilding = buildings.find(
        (building) => normalizeAddress(building.address) === normalized
      )

      if (matchedBuilding) {
        setField("buildingId", matchedBuilding.id)
        setShowAddBuildingPrompt(false)
        setBuildingCreateOpen(false)
        setPromptAddress("")
        setSuggestedBuilding(null)
        return
      }

      setSuggestedBuilding(null)

      setField("buildingId", null)
      if (declinedBuildingAddresses.includes(normalized)) {
        setShowAddBuildingPrompt(false)
        setBuildingCreateOpen(false)
        setPromptAddress("")
        return
      }

      setPromptAddress(finalAddress)
      if (!addressFromPlaces) {
        setSuggestedBuilding(null)
        return
      }
      setShowAddBuildingPrompt(true)
      setBuildingCreateOpen(false)
      setBuildingCreateAddress(finalAddress)
      setBuildingCreateBorough(
        typeof form.borough === "string" ? (form.borough as string) : ""
      )
      setBuildingCreateNeighborhood(
        typeof form.neighborhood === "string" ? (form.neighborhood as string) : ""
      )
    },
    [buildings, declinedBuildingAddresses, form.borough, form.neighborhood, normalizeAddress, setField, addressFromPlaces]
  )

  const handleCreateBuilding = useCallback(async () => {
    // Use address/borough/neighborhood directly from the form
    const address = ((form.address as string) || "").trim()
    const borough = ((form.borough as string) || "").trim()
    const neighborhood = ((form.neighborhood as string) || "").trim()

    if (!address || !borough) {
      toast.error("Address and borough are required")
      return
    }

    setBuildingCreateSaving(true)
    try {
      const res = await fetch("/api/buildings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address,
          borough,
          neighborhood: neighborhood || null,
        }),
      })
      const data = (await res.json()) as BuildingOption | { error?: string }
      if (!res.ok) {
        throw new Error(
          typeof data === "object" && data && "error" in data && data.error
            ? data.error
            : "Failed to create building"
        )
      }

      const created = data as BuildingOption
      setBuildings((prev) => [...prev, created].sort((a, b) => a.address.localeCompare(b.address)))
      setField("buildingId", created.id)
      setBuildingCreateOpen(true) // use as "added" flag for UI
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create building")
    } finally {
      setBuildingCreateSaving(false)
    }
  }, [form, setField])

  useEffect(() => {
    if (!open || !deal?.id) return
    fetch(`/api/deals/${deal.id}/history`)
      .then((r) => r.json())
      .then((data) => {
        setStageTimeline(Array.isArray(data?.stageTimeline) ? data.stageTimeline : [])
        setDealHistory(Array.isArray(data?.history) ? data.history : [])
      })
      .catch(() => { setStageTimeline([]); setDealHistory([]) })
  }, [open, deal?.id])

  useEffect(() => {
    if (!open || !deal?.id) {
      setComments([])
      setCommentsShelfOpen(false)
      return
    }
    // Load last-seen timestamp for unread tracking
    const stored = typeof window !== "undefined" ? localStorage.getItem(`door-comments-seen-${deal.id}`) : null
    setLastSeenCommentTs(stored)

    setCommentsLoading(true)
    fetch(`/api/deals/${deal.id}/comments`)
      .then((r) => r.json())
      .then((data) => setComments(Array.isArray(data) ? data : []))
      .catch(() => setComments([]))
      .finally(() => setCommentsLoading(false))
  }, [open, deal?.id])

  const toggleAgent = useCallback((id: string) => {
    setSelectedAgentIds((prev) => {
      const next = prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
      if (isEdit) {
        // Only dirty if result differs from initial agents
        const same = next.length === initialAgents.length && next.every(a => initialAgents.includes(a))
        if (!same) setIsDirty(true)
      }
      return next
    })
  }, [isEdit, initialAgents])

  const handlePostComment = async () => {
    if (!commentText.trim() || !deal?.id) return
    setCommentSaving(true)
    try {
      const res = await fetch(`/api/deals/${deal.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: commentText.trim(),
          authorId: currentAgent.id || CURRENT_AGENT_ID,
          authorName: currentAgent.name || "Mark",
        }),
      })
      if (res.ok) {
        const newComment = await res.json()
        setComments(prev => [newComment, ...prev])
        setCommentText("")
      }
    } finally {
      setCommentSaving(false)
    }
  }

  const formatRelativeTime = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return "just now"
    if (mins < 60) return `${mins}m ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    return `${days} days ago`
  }

  const handleCreate = async () => {
    setSaving(true)
    try {
      const payload: Record<string, unknown> = { ...form, agent_ids: selectedAgentIds }
      if (payload.source === "") payload.source = null
      await onSave(payload)
      onClose()
    } catch {
      // Error handled by parent
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deal || !onDelete) return
    setDeleting(true)
    try {
      await onDelete(deal.id)
      onClose()
    } finally {
      setDeleting(false)
    }
  }

  if (!config) return null

  const selectedAgents = agents.filter((a) => selectedAgentIds.includes(a.id))
  const filteredAgents = agents.filter((a) =>
    a.name.toLowerCase().includes(agentSearch.toLowerCase())
  )

  const renderField = (field: FieldConfig) => {
    if (field.type === "agent") return null
    if (field.type === "stage") return null
    if (field.key === "source") return null

    const value = form[field.key]
    const fieldWrapClass =
      field.type === "textarea" ? "space-y-1 col-span-2" : "space-y-1"

    if (field.type === "borough") {
      return (
        <div key={field.key} className={fieldWrapClass}>
          <label className="text-xs font-medium text-muted-foreground">
            {field.label}
          </label>
          <Select
            value={(value as string) || ""}
            onValueChange={(v) => setField(field.key, v)}
          >
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Select borough" />
            </SelectTrigger>
            <SelectContent>
              {BOROUGHS.map((b) => (
                <SelectItem key={b} value={b}>
                  {b}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )
    }

    if (field.type === "boolean") {
      return (
        <div key={field.key} className="flex items-center gap-2.5 min-h-9">
          <label className="text-xs font-medium text-muted-foreground flex-1">
            {field.label}
          </label>
          <button
            type="button"
            onClick={() => setField(field.key, !value)}
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
              value ? "bg-[var(--fm-amber)]" : "bg-muted"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform ${
                value ? "translate-x-4" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      )
    }

    if (field.type === "textarea") {
      return (
        <div key={field.key} className={fieldWrapClass}>
          <label className="text-xs font-medium text-muted-foreground">
            {field.label}
          </label>
          <textarea
            value={(value as string) || ""}
            onChange={(e) => setField(field.key, e.target.value)}
            className="w-full min-h-[64px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
            placeholder={field.placeholder || ""}
          />
        </div>
      )
    }

    if (field.type === "date") {
      const dateValue = value as string | undefined
      const dateObj = dateValue ? parse(dateValue, "yyyy-MM-dd", new Date()) : undefined
      const validDate = dateObj && !isNaN(dateObj.getTime()) ? dateObj : undefined
      return (
        <div key={field.key} className={fieldWrapClass}>
          <label className="text-xs font-medium text-muted-foreground">
            {field.label}
          </label>
          <Popover>
            <PopoverTrigger
              className="flex h-9 w-full items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm text-left"
            >
              <CalendarIcon className="h-4 w-4 text-muted-foreground shrink-0" />
              {validDate ? (
                <span>{format(validDate, "MMM d, yyyy")}</span>
              ) : (
                <span className="text-muted-foreground">Pick a date</span>
              )}
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={validDate}
                onSelect={(date) => {
                  if (date) {
                    setField(field.key, format(date, "yyyy-MM-dd"))
                  }
                }}
                classNames={{
                  today: "bg-[#b45309]/20 text-foreground",
                  day: "group/day relative aspect-square h-full w-full rounded-md p-0 text-center select-none data-[selected=true]:bg-[#b45309] data-[selected=true]:text-white",
                }}
              />
            </PopoverContent>
          </Popover>
        </div>
      )
    }

    if (field.type === "address") {
      const currentAddress = (value as string) || ""
      const canShowBuildingPrompt =
        showAddBuildingPrompt &&
        normalizeAddress(promptAddress) === normalizeAddress(currentAddress) &&
        !!currentAddress.trim()

      return (
        <div key={field.key} className={fieldWrapClass}>
          <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
            {field.label}
            {field.required && <span className="text-destructive ml-0.5">*</span>}
            {addressFromPlaces && currentAddress.trim() && (
              <span className="text-emerald-500 text-[10px] font-normal">✓</span>
            )}
          </label>
          <AddressAutocomplete
            value={currentAddress}
            onChange={(v) => {
              setField(field.key, v)
              if (normalizeAddress(v) !== normalizeAddress(promptAddress)) {
                setShowAddBuildingPrompt(false)
                setBuildingCreateOpen(false)
                setAddressFromPlaces(false)
                setSuggestedBuilding(null)
                // Clear borough if user is typing manually (not Places-confirmed)
                setField("borough", "")
                setField("neighborhood", "")
              }
            }}
            onTopSuggestionReady={(s) => {
              // Only show "Is this?" if user hasn't already selected from Places
              if (!addressFromPlaces) setTopPlacesSuggestion(s)
            }}
            onPlaceSelected={() => {
              setAddressFromPlaces(true)
              setTopPlacesSuggestion(null)
            }}
            onAddressCommitted={handleAddressCommitted}
            onBoroughDetected={(borough) => setField("borough", borough)}
            onNeighborhoodDetected={(neighborhood) => {
              const BOROUGHS = ["Manhattan", "Brooklyn", "Queens", "Bronx", "Staten Island"]
              if (!BOROUGHS.includes(neighborhood)) setField("neighborhood", neighborhood)
            }}
            placeholder={field.placeholder || "Start typing an address…"}
          />
          {/* "Is this?" suggestion - disabled, back burner */}
          {canShowBuildingPrompt && (
            <div className="mt-1.5 flex items-center gap-1.5">
              {buildingCreateOpen ? (
                <span className="text-xs text-emerald-500 flex items-center gap-1">
                  ✓ Added to buildings
                </span>
              ) : (
                <button
                  type="button"
                  disabled={buildingCreateSaving}
                  onClick={handleCreateBuilding}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 disabled:opacity-40"
                >
                  {buildingCreateSaving ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <span>+ Save to buildings</span>
                  )}
                </button>
              )}
            </div>
          )}
        </div>
      )
    }

    return (
      <div key={field.key} className={fieldWrapClass}>
        <label className="text-xs font-medium text-muted-foreground">
          {field.label}
          {field.required && <span className="text-destructive ml-0.5">*</span>}
        </label>
        <Input
          value={(value as string) || ""}
          onChange={(e) => setField(field.key, e.target.value)}
          placeholder={field.placeholder || ""}
          className="h-9 text-sm"
        />
      </div>
    )
  }

  const renderStage = () => (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground">Stage</label>
      <button
        type="button"
        onClick={() => { const next = !stageShelfOpen; closeAllShelves(); setStageShelfOpen(next); }}
        className="w-full h-9 flex items-center gap-2 px-3 rounded-md border border-input bg-background text-sm hover:bg-accent/50 transition-colors text-left"
      >
        {form.stage ? (
          <>
            <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: stages.find(s => s.name === form.stage)?.color || "#6b7280" }} />
            <span className="flex-1 truncate">{form.stage as string}</span>
          </>
        ) : (
          <span className="text-muted-foreground flex-1">Select stage</span>
        )}
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      </button>
    </div>
  )

  const renderStageMobile = () => (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground">Stage</label>
      <Select
        value={(form.stage as string) || ""}
        onValueChange={(v) => setField("stage", v)}
      >
        <SelectTrigger className="h-9 text-sm">
          <SelectValue placeholder="Select stage" />
        </SelectTrigger>
        <SelectContent>
          {stages.map((s) => (
            <SelectItem key={s.name} value={s.name}>
              <span className="flex items-center gap-2">
                <span
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{ backgroundColor: s.color }}
                />
                {s.name}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )

  // Agent section
  const renderAgents = () => (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-muted-foreground">Agents</label>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => { const next = !agentPanelOpen; closeAllShelves(); setAgentPanelOpen(next); }}
          className="text-xs"
        >
          <Users className="h-3 w-3 mr-1" />
          {selectedAgents.length === 0 ? "Add Agent" : "Edit"}
        </Button>
      </div>
      {selectedAgents.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedAgents.map((agent) => (
            <div key={agent.id} className="flex items-center gap-1">
              <AgentChip agent={agent} mode="full" />
              <button
                onClick={() => toggleAgent(agent.id)}
                className="h-4 w-4 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  const formatStageDuration = (seconds: number | null, enteredAt: string) => {
    const totalSeconds =
      seconds ??
      Math.max(0, Math.floor((Date.now() - new Date(enteredAt).getTime()) / 1000))
    const days = Math.floor(totalSeconds / 86400)
    const hours = Math.floor((totalSeconds % 86400) / 3600)
    const mins = Math.floor((totalSeconds % 3600) / 60)
    if (days > 0) return `${days}d ${hours}h`
    if (hours > 0) return `${hours}h ${mins}m`
    return `${Math.max(1, mins)}m`
  }

  const formContent = (
    <div className="space-y-3 py-2.5">
      <div className="grid grid-cols-2 gap-x-3 gap-y-2">
        {config.fields
          .filter((f) => f.type !== "agent" && f.type !== "stage")
          .map(renderField)}
        {isMobile ? renderStageMobile() : renderStage()}
      </div>
      {/* Lease dates hidden - to be integrated with archive flow later */}
      <Separator />
      {renderAgents()}
      {isEdit && deal?.id ? (
        <>
          <Separator />
          <Tabs defaultValue="history" className="w-full">
            <TabsList className={`tab-triggers grid w-full pointer-events-auto ${dealType === "applications" ? "grid-cols-3" : "grid-cols-4"}`}>
              <TabsTrigger value="history">History</TabsTrigger>
              {dealType !== "applications" && <TabsTrigger value="showings">Showings</TabsTrigger>}
              <TabsTrigger value="tasks">Tasks</TabsTrigger>
              <TabsTrigger value="comments">Comments</TabsTrigger>
            </TabsList>
            <TabsContent value="history" className="mt-3">
              <div className="space-y-2">
                {(() => {
                  // Show most recent change from dealHistory
                  const recent = dealHistory[0]
                  if (!recent) return <p className="text-sm text-muted-foreground py-3 text-center">No history yet</p>
                  const FIELD_LABELS: Record<string, string> = { stage: "Stage", price: "Price", budget: "Price", notes: "Notes", agents: "Agents", property: "Name", client: "Name", applicant: "Name", email: "Email", phone: "Phone", borough: "Borough", address: "Address", showing: "Showing", task: "Task" }
                  return (
                    <div className="flex items-start gap-2.5 px-1">
                      <div className="h-2 w-2 rounded-full bg-muted-foreground/40 shrink-0 mt-1.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground mb-0.5">{FIELD_LABELS[recent.field] || recent.field} changed</p>
                        <p className="text-sm truncate">
                          {recent.oldValue ? <><span className="text-muted-foreground">{recent.oldValue}</span><span className="mx-1 text-muted-foreground">→</span></> : null}
                          <span className="font-medium">{recent.newValue || "—"}</span>
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {recent.changedByName || "System"} · {formatRelativeTime(recent.changedAt)}
                        </p>
                      </div>
                    </div>
                  )
                })()}
                <button
                  type="button"
                  onClick={async () => {
                    closeAllShelves(); setFullHistoryShelfOpen(true); setFullHistoryTab("all");
                    if (!deal?.id) return;
                    setFullHistoryLoading(true);
                    try {
                      const [s, t] = await Promise.all([
                        fetch(`/api/showings?deal_id=${deal.id}`).then(r => r.ok ? r.json() : []),
                        fetch(`/api/tasks?deal_id=${deal.id}`).then(r => r.ok ? r.json() : []),
                      ]);
                      setFullHistoryShowings(Array.isArray(s) ? s : []);
                      setFullHistoryTasks(Array.isArray(t) ? t : []);
                    } finally { setFullHistoryLoading(false); }
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                >
                  View full history →
                </button>
              </div>
            </TabsContent>
            {dealType !== "applications" && <TabsContent value="showings" className="mt-3">
              <ShowingList
                dealId={deal.id}
                shelfOpen={showingShelfOpen}
                onShelfOpenChange={(v) => {
                  if (v) { closeAllShelves(); setShowingShelfOpen(true) } else { setShowingShelfOpen(false) }
                }}
                onShowingSelect={(s) => {
                  if (s) { closeAllShelves(); setSelectedShowing(s) } else { setSelectedShowing(null) }
                }}
                onAtMaxChange={setShowingAtMax}
                refreshKey={showingRefreshKey}
              />
            </TabsContent>}
            <TabsContent value="tasks" className="mt-3">
              <TaskList
                dealId={deal.id}
                addShelfOpen={taskAddShelfOpen}
                onAddShelfOpenChange={(v) => {
                  if (v) { closeAllShelves(); setTaskAddShelfOpen(true) } else { setTaskAddShelfOpen(false) }
                }}
                onTaskSelect={(t) => {
                  setSelectedTask(t)
                  if (t) { closeAllShelves(); setSelectedTask(t) } else { setSelectedTask(null) }
                }}
                addTitle={taskAddTitle}
                setAddTitle={setTaskAddTitle}
                addDescription={taskAddDescription}
                setAddDescription={setTaskAddDescription}
                addDueDate={taskAddDueDate}
                setAddDueDate={setTaskAddDueDate}
                addPriority={taskAddPriority}
                setAddPriority={setTaskAddPriority}
                addSaving={taskAddSaving}
                onAddTask={async () => {
                  if (!taskAddTitle.trim()) return
                  setTaskAddSaving(true)
                  try {
                    const res = await fetch("/api/tasks", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        dealId: deal.id,
                        title: taskAddTitle.trim(),
                        description: taskAddDescription.trim() || undefined,
                        dueDate: taskAddDueDate || undefined,
                        priority: taskAddPriority,
                        status: "todo",
                      }),
                    })
                    if (res.ok) {
                      setTaskAddTitle("")
                      setTaskAddDescription("")
                      setTaskAddDueDate("")
                      setTaskAddPriority("medium")
                      setTaskAddShelfOpen(false)
                      setTaskRefreshKey(k => k + 1)
                    }
                  } finally { setTaskAddSaving(false) }
                }}
                refreshKey={taskRefreshKey}
              />
            </TabsContent>
            <TabsContent value="comments" className="mt-3">
              <div className="space-y-2">
                {commentsLoading ? (
                  <p className="text-sm text-muted-foreground py-3 text-center">Loading…</p>
                ) : comments.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-3 text-center">No comments yet</p>
                ) : (() => {
                  const latest = comments[0]
                  const unread = lastSeenCommentTs
                    ? comments.filter(c => new Date(c.createdAt) > new Date(lastSeenCommentTs)).length
                    : 0
                  return (
                    <>
                      {/* Most recent comment */}
                      <div className="px-1 py-1">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-xs font-medium">{latest.authorName}</span>
                          <span className="text-[11px] text-muted-foreground">{formatRelativeTime(latest.createdAt)}</span>
                        </div>
                        <p className="text-sm whitespace-pre-wrap line-clamp-3">{latest.content}</p>
                      </div>
                      {/* Show more button */}
                      {comments.length > 1 && (
                        <button
                          onClick={openCommentsShelf}
                          className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md hover:bg-muted/50 transition-colors text-xs text-muted-foreground hover:text-foreground"
                        >
                          <span>Show all {comments.length} comments</span>
                          {unread > 0 && (
                            <span className="bg-[var(--fm-amber)] text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-full">
                              {unread} new
                            </span>
                          )}
                        </button>
                      )}
                    </>
                  )
                })()}
                {/* Input */}
                <div className="flex items-end gap-2 pt-1">
                  <textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Add a comment…"
                    rows={2}
                    className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); handlePostComment() }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handlePostComment}
                    disabled={commentSaving || !commentText.trim()}
                    className="h-9 w-9 rounded-md flex items-center justify-center bg-[var(--fm-amber)] text-white hover:bg-[var(--fm-amber)]/90 transition-colors disabled:opacity-40"
                  >
                    {commentSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizonal className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </>
      ) : null}
    </div>
  )

  const agentsCanDelete = typeof window !== "undefined"
    ? localStorage.getItem("door-config-agents-can-delete") === "true"
    : false
  const canDelete = isEdit && onDelete && (isAdmin || agentsCanDelete)

  const footer = (
    <div className="flex items-center justify-between gap-2">
      <div>
        {canDelete && (
          deleteConfirm ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-destructive">Delete this deal?</span>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? <Loader2 className="h-3 w-3 animate-spin" /> : "Yes"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDeleteConfirm(false)}
              >
                No
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => setDeleteConfirm(true)}
            >
              Delete
            </Button>
          )
        )}
      </div>
      <div className="flex items-center gap-2">
        {!isEdit && (
          <Button
            size="sm"
            onClick={handleCreate}
            disabled={saving}
            className="bg-[var(--fm-amber)] hover:bg-[var(--fm-amber)]/90 text-white"
          >
            {saving && <Loader2 className="h-3 w-3 animate-spin mr-1.5" />}
            Create Deal
          </Button>
        )}
      </div>
    </div>
  )

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={(v) => !v && handleClose()}>
        <SheetContent side="bottom" className="max-h-[90vh]">
          <SheetHeader>
            <SheetTitle>{isEdit ? "Edit Deal" : `New ${config.name}`}</SheetTitle>
          </SheetHeader>
          {formContent}
          <div className="pt-4 border-t">{footer}</div>
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <>
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-[680px] p-0 overflow-visible">
        <div className="relative">
          {/* Main form */}
          <div className="p-4 max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{viewOnly ? deal?.primaryField || "Deal" : isEdit ? "Edit Deal" : `New ${config.name}`}</DialogTitle>
            </DialogHeader>
            {viewOnly ? (
              <div className="pointer-events-none select-none [&_.tab-triggers]:pointer-events-auto">
                {formContent}
              </div>
            ) : formContent}
            {!viewOnly && <DialogFooter>{footer}</DialogFooter>}
          </div>

          {/* Agent shelf - slides out from the right edge of the modal */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: "100%",
              width: !viewOnly && agentPanelOpen ? 220 : 0,
              height: "100%",
              borderLeft: agentPanelOpen ? "1px solid var(--border)" : "none",
              borderRadius: "0 12px 12px 0",
              background: "var(--background)",
              boxShadow: agentPanelOpen ? "4px 0 16px rgba(0,0,0,0.08)" : "none",
              transition: "width 0.25s cubic-bezier(0.4,0,0.2,1)",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              zIndex: 10,
            }}
          >
            <div style={{ width: 220, display: "flex", flexDirection: "column", height: "100%" }}>
              {agentPanelOpen && (
                <>
                  <div className="flex items-center justify-between px-3.5 py-3 border-b">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Add Agent</span>
                    <button onClick={() => setAgentPanelOpen(false)} className="text-muted-foreground hover:text-foreground">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="px-2.5 py-2 border-b">
                    <input
                      autoFocus
                      type="text"
                      placeholder="Search..."
                      value={agentSearch}
                      onChange={e => setAgentSearch(e.target.value)}
                      className="w-full text-xs bg-muted/50 rounded-md px-2.5 py-1.5 outline-none border-none"
                    />
                  </div>
                  <div className="flex-1 overflow-y-auto py-1.5">
                    {filteredAgents
                      .filter(a => !selectedAgentIds.includes(a.id))
                      .map(agent => (
                        <button
                          key={agent.id}
                          type="button"
                          onClick={() => toggleAgent(agent.id)}
                          className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-accent/50 transition-colors text-left"
                        >
                          <span
                            className="h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                            style={{ backgroundColor: agent.color }}
                          >
                            {agent.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                          </span>
                          <span className="text-sm">{agent.name}</span>
                          {!(agent as unknown as { isActive?: boolean }).isActive && <span className="text-[10px] text-muted-foreground ml-1">(inactive)</span>}
                        </button>
                      ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Stage shelf - slides out from the right edge of the modal */}
          <div
            onKeyDown={e => { if (e.key === "Escape") setStageShelfOpen(false); }}
            style={{
              position: "absolute",
              top: 0,
              left: "100%",
              width: !viewOnly && stageShelfOpen ? 220 : 0,
              height: "100%",
              borderLeft: stageShelfOpen ? "1px solid var(--border)" : "none",
              borderRadius: "0 12px 12px 0",
              background: "var(--background)",
              boxShadow: stageShelfOpen ? "4px 0 16px rgba(0,0,0,0.08)" : "none",
              transition: "width 0.25s cubic-bezier(0.4,0,0.2,1)",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              zIndex: 10,
            }}
          >
            <div style={{ width: 220, display: "flex", flexDirection: "column", height: "100%" }}>
              {stageShelfOpen && (
                <>
                  <div className="flex items-center justify-between px-3.5 py-3 border-b">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Stage</span>
                    <button onClick={() => setStageShelfOpen(false)} className="text-muted-foreground hover:text-foreground">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto py-1.5">
                    {stages.map(s => (
                      <button
                        key={s.name}
                        type="button"
                        onClick={() => { setField("stage", s.name); setStageShelfOpen(false); }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-accent/50 transition-colors text-left"
                      >
                        <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                        <span className="flex-1 text-sm truncate">{s.name}</span>
                        {(form.stage as string) === s.name && (
                          <span className="text-[var(--fm-amber)] text-xs shrink-0">✓</span>
                        )}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Showing schedule shelf - slides out from the right edge of the modal */}
          <ShowingScheduleShelf
            open={!viewOnly && showingShelfOpen}
            scheduleDate={showingScheduleDate}
            setScheduleDate={setShowingScheduleDate}
            showingType={showingType}
            setShowingType={setShowingType}
            saving={showingSaving}
            atMax={showingAtMax}
            onSchedule={async () => {
              if (!showingScheduleDate || showingAtMax) return
              setShowingSaving(true)
              try {
                const res = await fetch("/api/showings", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    dealId: deal!.id,
                    scheduledAt: showingScheduleDate,
                    showingType,
                  }),
                })
                if (res.ok) {
                  setShowingScheduleDate("")
                  setShowingType("private")
                  setShowingShelfOpen(false)
                  setShowingRefreshKey((k) => k + 1)
                }
              } finally {
                setShowingSaving(false)
              }
            }}
            onClose={() => setShowingShelfOpen(false)}
          />

          {/* Showing detail shelf */}
          <ShowingDetailShelf
            showing={selectedShowing}
            open={!viewOnly && !!selectedShowing}
            archiving={showingArchiving}
            onArchive={async () => {
              if (!selectedShowing) return
              setShowingArchiving(true)
              try {
                await fetch(`/api/showings/${selectedShowing.id}/cancel`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ reason: "archived" }),
                })
                setSelectedShowing(null)
                setShowingRefreshKey(k => k + 1)
              } finally { setShowingArchiving(false) }
            }}
            onClose={() => setSelectedShowing(null)}
          />

          {/* Comments shelf */}
          <div style={{
            position: "absolute", top: 0, left: "100%",
            width: commentsShelfOpen ? 280 : 0, height: "100%",
            borderLeft: commentsShelfOpen ? "1px solid var(--border)" : "none",
            borderRadius: "0 12px 12px 0",
            background: "var(--background)",
            boxShadow: commentsShelfOpen ? "4px 0 16px rgba(0,0,0,0.08)" : "none",
            transition: "width 0.25s cubic-bezier(0.4,0,0.2,1)",
            overflow: "hidden", display: "flex", flexDirection: "column", zIndex: 10,
          }}>
            <div style={{ width: 280, display: "flex", flexDirection: "column", height: "100%" }}>
              {commentsShelfOpen && (
                <>
                  <div className="flex items-center justify-between px-3.5 py-3 border-b shrink-0">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Comments</span>
                    <button onClick={() => setCommentsShelfOpen(false)} className="text-muted-foreground hover:text-foreground">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto px-3.5 py-3 space-y-2">
                    {comments.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-4">No comments yet</p>
                    ) : (
                      comments.map((c) => {
                        const isUnread = lastSeenCommentTs ? new Date(c.createdAt) > new Date(lastSeenCommentTs) : false
                        return (
                          <div key={c.id} className={`px-1 py-1.5 ${isUnread ? "bg-[var(--fm-amber)]/5 rounded-md" : ""}`}>
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <span className="text-xs font-medium">{c.authorName}</span>
                              <span className="text-[10px] text-muted-foreground">{formatRelativeTime(c.createdAt)}</span>
                              {isUnread && <span className="ml-auto text-[9px] text-[var(--fm-amber)] font-semibold">NEW</span>}
                            </div>
                            <p className="text-sm whitespace-pre-wrap">{c.content}</p>
                          </div>
                        )
                      })
                    )}
                  </div>
                  {/* Input in shelf too */}
                  <div className="flex items-end gap-2 px-3.5 py-3 border-t shrink-0">
                    <textarea
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="Add a comment…"
                      rows={2}
                      className="flex-1 rounded-md border border-input bg-background px-2.5 py-1.5 text-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); handlePostComment() }
                      }}
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        await handlePostComment()
                        // mark seen after posting
                        if (deal?.id) {
                          const ts = new Date().toISOString()
                          localStorage.setItem(`door-comments-seen-${deal.id}`, ts)
                          setLastSeenCommentTs(ts)
                        }
                      }}
                      disabled={commentSaving || !commentText.trim()}
                      className="h-8 w-8 rounded-md flex items-center justify-center bg-[var(--fm-amber)] text-white hover:bg-[var(--fm-amber)]/90 disabled:opacity-40"
                    >
                      {commentSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <SendHorizonal className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Task detail shelf */}
          <TaskDetailShelf
            task={selectedTask}
            open={!viewOnly && !!selectedTask}
            completing={taskCompleting}
            archiving={taskArchiving}
            onComplete={async () => {
              if (!selectedTask) return
              setTaskCompleting(true)
              try {
                await fetch(`/api/tasks/${selectedTask.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "complete" }) })
                setSelectedTask(null)
                setTaskRefreshKey(k => k + 1)
              } finally { setTaskCompleting(false) }
            }}
            onArchive={async () => {
              if (!selectedTask) return
              setTaskArchiving(true)
              try {
                await fetch(`/api/tasks/${selectedTask.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "archive" }) })
                setSelectedTask(null)
                setTaskRefreshKey(k => k + 1)
              } finally { setTaskArchiving(false) }
            }}
            onClose={() => setSelectedTask(null)}
          />

          {/* Task add shelf */}
          <TaskAddShelf
            open={!viewOnly && taskAddShelfOpen}
            title={taskAddTitle}
            setTitle={setTaskAddTitle}
            description={taskAddDescription}
            setDescription={setTaskAddDescription}
            dueDate={taskAddDueDate}
            setDueDate={setTaskAddDueDate}
            priority={taskAddPriority}
            setPriority={setTaskAddPriority}
            saving={taskAddSaving}
            onAdd={async () => {
              if (!taskAddTitle.trim()) return
              setTaskAddSaving(true)
              try {
                const res = await fetch("/api/tasks", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    dealId: deal!.id,
                    title: taskAddTitle.trim(),
                    description: taskAddDescription.trim() || undefined,
                    dueDate: taskAddDueDate || undefined,
                    priority: taskAddPriority,
                    status: "todo",
                  }),
                })
                if (res.ok) {
                  setTaskAddTitle("")
                  setTaskAddDescription("")
                  setTaskAddDueDate("")
                  setTaskAddPriority("medium")
                  setTaskAddShelfOpen(false)
                  setTaskRefreshKey(k => k + 1)
                }
              } finally { setTaskAddSaving(false) }
            }}
            onClose={() => setTaskAddShelfOpen(false)}
          />

          {/* Stage history shelf */}
          <div
            style={{
              position: "absolute", top: 0, left: "100%",
              width: stageHistoryShelfOpen ? 260 : 0, height: "100%",
              borderLeft: stageHistoryShelfOpen ? "1px solid var(--border)" : "none",
              borderRadius: "0 12px 12px 0",
              background: "var(--background)",
              boxShadow: stageHistoryShelfOpen ? "4px 0 16px rgba(0,0,0,0.08)" : "none",
              transition: "width 0.25s cubic-bezier(0.4,0,0.2,1)",
              overflow: "hidden", display: "flex", flexDirection: "column", zIndex: 10,
            }}
          >
            <div style={{ width: 260, display: "flex", flexDirection: "column", height: "100%" }}>
              {stageHistoryShelfOpen && (
                <>
                  <div className="flex items-center justify-between px-3.5 py-3 border-b shrink-0">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Stage History</span>
                    <button onClick={() => setStageHistoryShelfOpen(false)} className="text-muted-foreground hover:text-foreground">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto px-3.5 py-3">
                    {stageTimeline.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-4">No stage history</p>
                    ) : (
                      <div className="relative">
                        <div className="absolute left-2 top-1 bottom-1 w-px bg-border" />
                        <div className="space-y-4">
                          {stageTimeline.map((entry) => (
                            <div key={entry.id} className="flex items-start gap-3 pl-0.5">
                              <div
                                className="h-2.5 w-2.5 rounded-full shrink-0 mt-1 relative z-10"
                                style={{ backgroundColor: entry.stage?.color || "#6b7280" }}
                              />
                              <div className="flex-1 min-w-0">
                                <span
                                  className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium border mb-1"
                                  style={{
                                    color: entry.stage?.color || "#6b7280",
                                    borderColor: `${entry.stage?.color || "#6b7280"}40`,
                                    backgroundColor: `${entry.stage?.color || "#6b7280"}1A`,
                                  }}
                                >
                                  {entry.stageName}
                                </span>
                                <div className="text-[11px] font-medium">
                                  {formatStageDuration(entry.durationSeconds, entry.enteredAt)}
                                </div>
                                <div className="text-[10px] text-muted-foreground mt-0.5">
                                  {entry.changedByUser?.name || "System"} · {new Date(entry.enteredAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
          {/* Full history shelf */}
          {(() => {
            const FIELD_LABELS: Record<string, string> = { stage: "Stage", price: "Price", budget: "Price", notes: "Notes", agents: "Agents", property: "Name", client: "Name", applicant: "Name", email: "Email", phone: "Phone", borough: "Borough", address: "Address", showing: "Showing", task: "Task" }
            const DETAIL_FIELDS = ["property", "client", "applicant", "email", "phone", "borough", "address"]
            const TABS = [
              { key: "all", label: "All" },
              { key: "stage", label: "Stage" },
              { key: "price", label: "Price" },
              { key: "notes", label: "Notes" },
              { key: "agents", label: "Agents" },
              { key: "details", label: "Details" },
              ...(dealType !== "applications" ? [{ key: "showings", label: "Showings" }] : []),
              { key: "tasks", label: "Tasks" },
              { key: "comments", label: "Comments" },
            ]
            const filtered = fullHistoryTab === "all" ? dealHistory
              : fullHistoryTab === "stage" ? []  // stage uses timeline below
              : fullHistoryTab === "price" ? dealHistory.filter(e => e.field === "price" || e.field === "budget")
              : fullHistoryTab === "notes" ? dealHistory.filter(e => e.field === "notes")
              : fullHistoryTab === "agents" ? dealHistory.filter(e => e.field === "agents")
              : fullHistoryTab === "details" ? dealHistory.filter(e => DETAIL_FIELDS.includes(e.field))
              : dealHistory
            return (
              <div style={{
                position: "absolute", top: 0, left: "100%",
                width: fullHistoryShelfOpen ? 280 : 0, height: "100%",
                borderLeft: fullHistoryShelfOpen ? "1px solid var(--border)" : "none",
                borderRadius: "0 12px 12px 0",
                background: "var(--background)",
                boxShadow: fullHistoryShelfOpen ? "4px 0 16px rgba(0,0,0,0.08)" : "none",
                transition: "width 0.25s cubic-bezier(0.4,0,0.2,1)",
                overflow: "hidden", display: "flex", flexDirection: "column", zIndex: 10,
              }}>
                <div style={{ width: 280, display: "flex", flexDirection: "column", height: "100%" }}>
                  {fullHistoryShelfOpen && (
                    <>
                      <div className="flex items-center justify-between px-3.5 py-3 border-b shrink-0">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">History</span>
                        <button onClick={() => setFullHistoryShelfOpen(false)} className="text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" /></button>
                      </div>
                      {/* Tab bar */}
                      <div className="flex gap-1 px-2 pt-2 pb-1 flex-wrap shrink-0">
                        {TABS.map(t => (
                          <button key={t.key} onClick={() => setFullHistoryTab(t.key)}
                            className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${fullHistoryTab === t.key ? "bg-foreground text-background" : "text-muted-foreground hover:bg-accent"}`}>
                            {t.label}
                          </button>
                        ))}
                      </div>
                      <div className="flex-1 overflow-y-auto px-3 py-2">
                        {fullHistoryTab === "stage" ? (
                          stageTimeline.length === 0 ? (
                            <p className="text-xs text-muted-foreground text-center py-4">No stage history</p>
                          ) : (
                            <div className="relative">
                              <div className="absolute left-2 top-1 bottom-1 w-px bg-border" />
                              <div className="space-y-4">
                                {stageTimeline.map(entry => (
                                  <div key={entry.id} className="flex items-start gap-3 pl-0.5">
                                    <div className="h-2.5 w-2.5 rounded-full shrink-0 mt-1 relative z-10" style={{ backgroundColor: entry.stage?.color || "#6b7280" }} />
                                    <div className="flex-1 min-w-0">
                                      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium border mb-1"
                                        style={{ color: entry.stage?.color || "#6b7280", borderColor: `${entry.stage?.color || "#6b7280"}40`, backgroundColor: `${entry.stage?.color || "#6b7280"}1A` }}>
                                        {entry.stageName}
                                      </span>
                                      <div className="text-[11px] font-medium">{formatStageDuration(entry.durationSeconds, entry.enteredAt)}</div>
                                      <div className="text-[10px] text-muted-foreground mt-0.5">{entry.changedByUser?.name || "System"} · {new Date(entry.enteredAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )
                        ) : fullHistoryTab === "showings" ? (
                          fullHistoryLoading ? <div className="py-4 flex justify-center"><div className="size-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" /></div>
                          : fullHistoryShowings.length === 0 ? <p className="text-xs text-muted-foreground text-center py-4">No showings</p>
                          : <div className="space-y-1.5">{fullHistoryShowings.map(s => {
                            const d = new Date(s.scheduledAt); const m = d.getMonth()+1; const day = d.getDate(); const h = d.getHours(); const min = d.getMinutes(); const ampm = h>=12?"pm":"am"; const hr = h%12||12; const mm = min===0?"":`:`+String(min).padStart(2,"0");
                            return <div key={s.id} className="flex items-center gap-2 py-1 border-b border-border/30 last:border-0"><div className={`h-2 w-2 rounded-full shrink-0 ${s.status==="scheduled"?"bg-blue-500":s.status==="completed"?"bg-green-500":"bg-muted-foreground/40"}`} /><span className="flex-1 text-xs">{s.showingType==="open_house"?"Open house":"Private"}: {m}/{day} {hr}{mm}{ampm}</span><span className="text-[10px] text-muted-foreground">{s.status==="scheduled"?"upcoming":s.status==="completed"?"done":"archived"}</span></div>
                          })}</div>
                        ) : fullHistoryTab === "tasks" ? (
                          fullHistoryLoading ? <div className="py-4 flex justify-center"><div className="size-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" /></div>
                          : fullHistoryTasks.length === 0 ? <p className="text-xs text-muted-foreground text-center py-4">No tasks</p>
                          : <div className="space-y-1.5">{fullHistoryTasks.map(t => {
                            const isDone = t.status === "completed";
                            const pColors: Record<string,string> = {low:"text-muted-foreground",medium:"text-blue-500",high:"text-orange-500",urgent:"text-red-500"};
                            return <div key={t.id} className="flex items-start gap-2 py-1 border-b border-border/30 last:border-0"><div className={`h-2 w-2 rounded-full shrink-0 mt-1 ${isDone?"bg-green-500":"bg-muted-foreground/40"}`} /><div className="flex-1 min-w-0"><p className={`text-xs ${isDone?"line-through text-muted-foreground":""}`}>{t.title}</p><p className="text-[10px] text-muted-foreground">{t.creator?.name||"Unknown"} · <span className={pColors[t.priority]}>{t.priority}</span>{t.dueDate?` · due ${new Date(t.dueDate).toLocaleDateString("en-US",{month:"short",day:"numeric"})}`:""}</p></div><span className={`text-[10px] shrink-0 ${isDone?"text-green-600":"text-muted-foreground"}`}>{isDone?"done":"open"}</span></div>
                          })}</div>
                        ) : fullHistoryTab === "comments" ? (
                          comments.length === 0 ? <p className="text-xs text-muted-foreground text-center py-4">No comments</p>
                          : <div className="space-y-2">{comments.map(c => <div key={c.id} className="py-1 border-b border-border/30 last:border-0"><div className="flex items-center gap-1.5 mb-0.5"><span className="text-xs font-medium">{c.authorName}</span><span className="text-[10px] text-muted-foreground">{formatRelativeTime(c.createdAt)}</span></div><p className="text-xs text-muted-foreground">{c.content}</p></div>)}</div>
                        ) : filtered.length === 0 ? (
                          <p className="text-xs text-muted-foreground text-center py-4">No changes recorded</p>
                        ) : (
                          <div className="relative">
                            <div className="absolute left-2 top-1 bottom-1 w-px bg-border" />
                            <div className="space-y-4">
                              {filtered.map(entry => (
                                <div key={entry.id} className="flex items-start gap-3 pl-0.5">
                                  <div className="h-2.5 w-2.5 rounded-full bg-muted-foreground/40 shrink-0 mt-1 relative z-10" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-[11px] text-muted-foreground mb-0.5">{FIELD_LABELS[entry.field] || entry.field} changed</p>
                                    <p className="text-sm">
                                      {entry.oldValue ? <><span className="text-muted-foreground text-xs">{entry.oldValue}</span><span className="mx-1 text-muted-foreground">→</span></> : null}
                                      <span className="font-medium text-xs">{entry.newValue || "—"}</span>
                                    </p>
                                    <p className="text-[10px] text-muted-foreground mt-0.5">{entry.changedByName || "System"} · {formatRelativeTime(entry.changedAt)}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            )
          })()}
        </div>
      </DialogContent>
    </Dialog>

  </>
  )
}
