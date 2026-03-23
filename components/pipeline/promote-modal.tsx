"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, CheckCircle, CalendarIcon } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { format, parse } from "date-fns"

interface PromoteModalProps {
  open: boolean
  onClose: () => void
  rentalProperty: string
  rentalBorough?: string | null
  onPromote: (data: {
    applicant: string
    phone?: string
    moveInDate?: string
    notes?: string
  }) => Promise<void>
}

export function PromoteModal({
  open,
  onClose,
  rentalProperty,
  rentalBorough,
  onPromote,
}: PromoteModalProps) {
  const [applicant, setApplicant] = useState("")
  const [phone, setPhone] = useState("")
  const [moveInDate, setMoveInDate] = useState("")
  const [notes, setNotes] = useState("")
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async () => {
    if (!applicant) return
    setSaving(true)
    try {
      await onPromote({ applicant, phone, moveInDate, notes })
      setSuccess(true)
      setTimeout(() => {
        onClose()
        setSuccess(false)
        setApplicant("")
        setPhone("")
        setMoveInDate("")
        setNotes("")
      }, 1500)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Promote to Application</DialogTitle>
          <p className="text-xs text-muted-foreground">
            Create a linked application from this rental
          </p>
        </DialogHeader>

        {success ? (
          <div className="py-8 text-center">
            <CheckCircle className="h-8 w-8 text-emerald-600 mx-auto mb-2" />
            <p className="text-sm font-medium">Application Created</p>
            <p className="text-xs text-muted-foreground mt-1">
              Redirecting to Applications...
            </p>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {/* Pre-filled info */}
            <div className="rounded-lg bg-muted px-3 py-2.5 space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Address</span>
                <span className="font-medium">{rentalProperty}</span>
              </div>
              {rentalBorough && (
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Borough</span>
                  <span className="font-medium">{rentalBorough}</span>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Applicant Name <span className="text-destructive">*</span>
              </label>
              <Input
                value={applicant}
                onChange={(e) => setApplicant(e.target.value)}
                placeholder="Full name"
                className="h-9 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Phone</label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="555-0100"
                className="h-9 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Move-in Date</label>
              <Popover>
                <PopoverTrigger
                  className="flex h-9 w-full items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm text-left"
                >
                  <CalendarIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                  {moveInDate ? (
                    <span>{format(parse(moveInDate, "yyyy-MM-dd", new Date()), "MMM d, yyyy")}</span>
                  ) : (
                    <span className="text-muted-foreground">Pick a date</span>
                  )}
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={moveInDate ? parse(moveInDate, "yyyy-MM-dd", new Date()) : undefined}
                    onSelect={(date) => {
                      if (date) {
                        setMoveInDate(format(date, "yyyy-MM-dd"))
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

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full min-h-[60px] rounded-md border border-input bg-background px-3 py-2 text-sm resize-y focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          </div>
        )}

        {!success && (
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={!applicant || saving}
              className="bg-[var(--fm-amber)] hover:bg-[var(--fm-amber)]/90 text-white"
            >
              {saving && <Loader2 className="h-3 w-3 animate-spin mr-1.5" />}
              Create Application
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
