"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { useIsMobile } from "@/hooks/use-media-query"
import { cn } from "@/lib/utils"
import { Loader2 } from "lucide-react"

interface ArchiveStage {
  id: string
  name: string
  color: string
  isClosedWon: boolean
  isClosedLost: boolean
}

interface ArchiveModalProps {
  open: boolean
  onClose: () => void
  dealType: string
  dealName: string
  onConfirm: (reason: string, stageId?: string) => Promise<void>
}

// Map pipeline-page dealType key to DB dealType
const DEAL_TYPE_MAP: Record<string, string> = {
  rentals: "rental",
  sellers: "seller",
  buyers: "buyer",
  applications: "application",
  "tenant-rep": "tenant_rep",
  rental: "rental",
  seller: "seller",
  buyer: "buyer",
  application: "application",
  tenant_rep: "tenant_rep",
}

export function ArchiveModal({
  open,
  onClose,
  dealType,
  dealName,
  onConfirm,
}: ArchiveModalProps) {
  const isMobile = useIsMobile()
  const [selected, setSelected] = useState<ArchiveStage | null>(null)
  const [loading, setLoading] = useState(false)
  const [stages, setStages] = useState<ArchiveStage[]>([])
  const [fetchingStages, setFetchingStages] = useState(false)

  useEffect(() => {
    if (!open) return
    setSelected(null)
    setFetchingStages(true)
    const dbDealType = DEAL_TYPE_MAP[dealType] || dealType
    fetch(`/api/stages?dealType=${dbDealType}&archive=true`)
      .then(r => r.ok ? r.json() : [])
      .then((data: Array<{ id: string; name: string; color: string; isClosedWon: boolean; isClosedLost: boolean }>) => {
        setStages(data)
        // If no archive stages configured — auto archive immediately
        if (!data || data.length === 0) {
          onConfirm("Archived", undefined).then(onClose).catch(() => {})
        }
      })
      .catch(() => setStages([]))
      .finally(() => setFetchingStages(false))
  }, [open, dealType])

  const handleConfirm = async () => {
    if (!selected) return
    setLoading(true)
    try {
      await onConfirm(selected.name, selected.id)
      onClose()
    } finally {
      setLoading(false)
    }
  }

  const content = (
    <div className="space-y-3 py-2">
      {fetchingStages ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      ) : stages.length === 0 ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <p className="text-xs font-medium text-muted-foreground">
            Why are you archiving this deal?
          </p>
          <div className="space-y-2">
            {stages.map((stage) => {
              const isSelected = selected?.id === stage.id
              return (
                <button
                  key={stage.id}
                  onClick={() => setSelected(stage)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3.5 py-3 rounded-lg border text-left transition-all text-sm",
                    isSelected
                      ? "border-current"
                      : "border-border hover:border-muted-foreground/30"
                  )}
                  style={{ color: isSelected ? stage.color : undefined }}
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full shrink-0 border-2"
                    style={{
                      borderColor: stage.color,
                      backgroundColor: isSelected ? stage.color : "transparent",
                    }}
                  />
                  <span className={cn("text-[13px]", isSelected ? "font-medium" : "text-foreground")}>
                    {stage.name}
                  </span>
                </button>
              )
            })}
          </div>
          <div className="rounded-lg bg-muted px-3 py-2.5 text-xs text-muted-foreground">
            Once archived this deal will be read-only and cannot be edited.
          </div>
        </>
      )}
    </div>
  )

  const footer = (
    <div className="flex items-center justify-end gap-2">
      <Button variant="outline" size="sm" onClick={onClose}>
        Cancel
      </Button>
      <Button
        size="sm"
        disabled={!selected || loading || stages.length === 0}
        onClick={handleConfirm}
      >
        {loading && <Loader2 className="h-3 w-3 animate-spin mr-1.5" />}
        Archive
      </Button>
    </div>
  )

  // Don't render the modal if auto-archiving (no stages)
  if (open && !fetchingStages && stages.length === 0) return null

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
        <SheetContent side="bottom" className="max-h-[90vh]">
          <SheetHeader>
            <SheetTitle>Archive Deal</SheetTitle>
            {dealName && <p className="text-xs text-muted-foreground">{dealName}</p>}
          </SheetHeader>
          {content}
          <div className="pt-4 border-t">{footer}</div>
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Archive Deal</DialogTitle>
          {dealName && <p className="text-xs text-muted-foreground">{dealName}</p>}
        </DialogHeader>
        {content}
        <DialogFooter>{footer}</DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
