"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { useIsMobile } from "@/hooks/use-media-query"
import { cn } from "@/lib/utils"
import type { Deal } from "./deal-table"

interface ArchivedDealModalProps {
  open: boolean
  onClose: () => void
  deal: Deal | null
  dealType: string
}

function Field({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-0.5">{label}</p>
      <p className="text-[13px] text-foreground">{value}</p>
    </div>
  )
}

export function ArchivedDealModal({ open, onClose, deal, dealType }: ArchivedDealModalProps) {
  const isMobile = useIsMobile()
  if (!deal) return null

  const raw = (deal.rawData || {}) as Record<string, unknown>

  const agentNames = deal.agents?.map(a => a.name).filter(Boolean).join(", ") || null

  const formatPrice = (price: string | null) => {
    if (!price) return null
    const num = parseFloat(price.replace(/[^0-9.]/g, ""))
    return isNaN(num) ? price : "$" + num.toLocaleString("en-US")
  }

  const formatDate = (d: string | null) => {
    if (!d) return null
    try { return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) } catch { return d }
  }

  const primaryLabel = dealType === "buyers" || dealType === "tenant-rep" ? "Client" : dealType === "applications" ? "Applicant" : "Address"

  const content = (
    <div className="space-y-5 py-3 px-1">
      {/* Header row — stage badge + archived date */}
      <div className="flex items-center gap-3 flex-wrap">
        <span
          className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-semibold"
          style={{
            backgroundColor: `${deal.stageColor || "#9ca3af"}22`,
            color: deal.stageColor || "#9ca3af",
            border: `0.5px solid ${deal.stageColor || "#9ca3af"}66`,
          }}
        >
          {deal.stage}
        </span>
        {raw.archivedAt ? (
          <span className="text-[11px] text-muted-foreground">
            Archived {formatDate(String(raw.archivedAt))}
          </span>
        ) : null}
      </div>

      {/* Deal info grid */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-3">
        <div className="col-span-2">
          <Field label={primaryLabel} value={deal.primaryField} />
        </div>
        {deal.borough && <Field label="Borough" value={deal.borough} />}
        {raw.unit ? <Field label="Unit" value={String(raw.unit)} /> : null}
        {raw.neighborhood ? <Field label="Neighborhood" value={String(raw.neighborhood)} /> : null}
        {deal.price ? <Field label="Price" value={formatPrice(deal.price)} /> : null}
        {agentNames ? <Field label="Agents" value={agentNames} /> : null}
        {raw.archiveReason ? <Field label="Archive reason" value={String(raw.archiveReason)} /> : null}
        {raw.leaseStartDate ? <Field label="Lease start" value={formatDate(String(raw.leaseStartDate))} /> : null}
        {raw.leaseEndDate ? <Field label="Lease end" value={formatDate(String(raw.leaseEndDate))} /> : null}
      </div>

      {/* Notes */}
      {deal.notes && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-1.5">Notes</p>
          <p className="text-[13px] text-foreground/80 whitespace-pre-wrap leading-relaxed">{deal.notes}</p>
        </div>
      )}

      {/* Divider */}
      <div className="border-t border-border" />

      {/* Footer info */}
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>{deal.updatedAt ? `Last updated ${formatDate(deal.updatedAt)}` : ""}</span>
        <span className={cn(
          "inline-flex items-center gap-1.5",
        )}>
          <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
          Archived
        </span>
      </div>
    </div>
  )

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
        <SheetContent side="bottom" className="max-h-[85vh]">
          <SheetHeader>
            <SheetTitle>{deal.primaryField}</SheetTitle>
          </SheetHeader>
          {content}
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-[15px]">{deal.primaryField}</DialogTitle>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  )
}
