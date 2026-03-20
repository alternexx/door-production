"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Loader2, Plus, Trash2 } from "lucide-react"

type DealType = "rental" | "seller" | "buyer" | "application" | "tenant_rep"

type TemplateItem = {
  label: string
  required: boolean
  order: number
}

type TemplateRow = {
  id: string
  dealType: DealType
  items: TemplateItem[]
}

type TemplatesResponse = {
  templates: TemplateRow[]
  currentUser: {
    isAdmin: boolean
  }
}

const DEAL_TYPE_OPTIONS: Array<{ value: DealType; label: string }> = [
  { value: "rental", label: "Rental" },
  { value: "seller", label: "Seller" },
  { value: "buyer", label: "Buyer" },
  { value: "application", label: "Application" },
  { value: "tenant_rep", label: "Tenant Rep" },
]

function normalizeItems(items: TemplateItem[]): TemplateItem[] {
  return items
    .map((item, idx) => ({
      label: item.label.trim(),
      required: Boolean(item.required),
      order: idx,
    }))
    .filter((item) => item.label.length > 0)
}

export function ChecklistTemplatesWidget() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [selectedDealType, setSelectedDealType] = useState<DealType>("rental")
  const [templatesByType, setTemplatesByType] = useState<Partial<Record<DealType, TemplateRow>>>({})
  const [draftItems, setDraftItems] = useState<TemplateItem[]>([])

  const selectedTemplate = templatesByType[selectedDealType]

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/checklist-templates")
        if (!res.ok) return
        const data: TemplatesResponse = await res.json()
        const map: Partial<Record<DealType, TemplateRow>> = {}
        for (const row of data.templates || []) {
          map[row.dealType] = {
            ...row,
            items: Array.isArray(row.items) ? row.items : [],
          }
        }
        setTemplatesByType(map)
        setIsAdmin(Boolean(data.currentUser?.isAdmin))
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  useEffect(() => {
    const next = templatesByType[selectedDealType]?.items ?? []
    setDraftItems(next.length > 0 ? [...next].sort((a, b) => a.order - b.order) : [])
  }, [templatesByType, selectedDealType])

  const summary = useMemo(() => {
    const completed = draftItems.filter((item) => item.required).length
    return `${draftItems.length} items • ${completed} required`
  }, [draftItems])

  const setItem = (index: number, updates: Partial<TemplateItem>) => {
    setDraftItems((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, ...updates } : item))
    )
  }

  const addItem = () => {
    setDraftItems((prev) => [
      ...prev,
      { label: "", required: false, order: prev.length },
    ])
  }

  const removeItem = (index: number) => {
    setDraftItems((prev) =>
      prev.filter((_, idx) => idx !== index).map((item, idx) => ({ ...item, order: idx }))
    )
  }

  const saveTemplate = async () => {
    if (!isAdmin) return
    setSaving(true)
    try {
      const payload = {
        dealType: selectedDealType,
        items: normalizeItems(draftItems),
      }

      const method = selectedTemplate?.id ? "PATCH" : "POST"
      const res = await fetch("/api/checklist-templates", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) return
      const saved: TemplateRow = await res.json()
      setTemplatesByType((prev) => ({ ...prev, [saved.dealType]: saved }))
      setDraftItems(Array.isArray(saved.items) ? [...saved.items].sort((a, b) => a.order - b.order) : [])
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Admin Settings: Deal Checklist Templates</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          </div>
        ) : !isAdmin ? (
          <p className="text-sm text-muted-foreground">Admin access required to manage checklist templates.</p>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <div className="w-[220px]">
                <Select
                  value={selectedDealType}
                  onValueChange={(value) => setSelectedDealType(value as DealType)}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Select deal type" />
                  </SelectTrigger>
                  <SelectContent>
                    {DEAL_TYPE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <span className="text-xs text-muted-foreground">{summary}</span>
            </div>

            <div className="space-y-2">
              {draftItems.length === 0 ? (
                <p className="text-sm text-muted-foreground">No items yet.</p>
              ) : (
                draftItems.map((item, index) => (
                  <div key={`${selectedDealType}-${index}`} className="rounded-md border px-3 py-2">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 shrink-0">
                        <Checkbox
                          checked={item.required}
                          onCheckedChange={(checked) => setItem(index, { required: checked === true })}
                        />
                        <span className="text-xs text-muted-foreground">Required</span>
                      </div>
                      <Input
                        value={item.label}
                        onChange={(e) => setItem(index, { label: e.target.value })}
                        placeholder="Checklist item label"
                        className="h-8 text-sm"
                      />
                      <button
                        type="button"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => removeItem(index)}
                        title="Remove item"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex items-center justify-between">
              <Button type="button" variant="outline" onClick={addItem}>
                <Plus className="size-4" />
                Add Item
              </Button>
              <Button
                type="button"
                onClick={saveTemplate}
                disabled={saving}
                className="bg-[var(--fm-amber)] hover:bg-[var(--fm-amber)]/90 text-white"
              >
                {saving ? <Loader2 className="size-4 animate-spin" /> : "Save Template"}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
