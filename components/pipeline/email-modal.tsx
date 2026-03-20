"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useIsMobile } from "@/hooks/use-media-query"
import { EMAIL_TEMPLATES } from "@/lib/deal-types"
import { FileText, Send, X, ChevronDown } from "lucide-react"

interface Recipient {
  name?: string
  email?: string
}

interface EmailModalProps {
  open: boolean
  onClose: () => void
  recipients: Recipient[]
}

export function EmailModal({ open, onClose, recipients }: EmailModalProps) {
  const isMobile = useIsMobile()
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
  const [cc, setCc] = useState("")
  const [bcc, setBcc] = useState("")
  const [showCcBcc, setShowCcBcc] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)

  const validRecipients = recipients.filter((r) => r.email)
  const invalidCount = recipients.length - validRecipients.length

  const applyTemplate = (tpl: (typeof EMAIL_TEMPLATES)[number]) => {
    const first = validRecipients[0]
    const fill = (str: string) =>
      str
        .replace(/\{\{name\}\}/g, first?.name || "there")
        .replace(/\{\{address\}\}/g, first?.name || "")
    setSubject(fill(tpl.subject))
    setBody(fill(tpl.body))
    setShowTemplates(false)
  }

  const content = (
    <div className="flex flex-col gap-0">
      {/* To */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b">
        <span className="text-xs text-muted-foreground w-10 shrink-0">To</span>
        <div className="flex-1 flex flex-wrap gap-1.5 items-center">
          {validRecipients.map((r, i) => (
            <span
              key={i}
              className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground"
            >
              {r.name ? `${r.name} <${r.email}>` : r.email}
            </span>
          ))}
          {validRecipients.length === 0 && (
            <span className="text-xs text-muted-foreground">No recipients with email</span>
          )}
        </div>
        {!showCcBcc && (
          <button
            onClick={() => setShowCcBcc(true)}
            className="text-[11px] text-muted-foreground hover:text-foreground"
          >
            CC / BCC
          </button>
        )}
      </div>
      {invalidCount > 0 && (
        <div className="px-4 py-1 text-xs text-destructive">
          {invalidCount} recipient{invalidCount > 1 ? "s" : ""} skipped (no email)
        </div>
      )}

      {/* CC/BCC */}
      {showCcBcc && (
        <>
          <div className="flex items-center gap-3 px-4 py-2 border-b">
            <span className="text-xs text-muted-foreground w-10 shrink-0">CC</span>
            <Input
              value={cc}
              onChange={(e) => setCc(e.target.value)}
              placeholder="cc@example.com"
              className="h-7 border-0 shadow-none text-sm px-0 focus-visible:ring-0"
            />
          </div>
          <div className="flex items-center gap-3 px-4 py-2 border-b">
            <span className="text-xs text-muted-foreground w-10 shrink-0">BCC</span>
            <Input
              value={bcc}
              onChange={(e) => setBcc(e.target.value)}
              placeholder="bcc@example.com"
              className="h-7 border-0 shadow-none text-sm px-0 focus-visible:ring-0"
            />
          </div>
        </>
      )}

      {/* Subject */}
      <div className="flex items-center gap-3 px-4 py-2 border-b">
        <span className="text-xs text-muted-foreground w-10 shrink-0">Subject</span>
        <Input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Subject"
          className="h-7 border-0 shadow-none text-sm px-0 focus-visible:ring-0"
        />
      </div>

      {/* Body */}
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Write your message..."
        className="flex-1 min-h-[200px] border-0 outline-none resize-none px-4 py-3 text-sm leading-relaxed bg-transparent"
      />

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-2.5 border-t">
        <div className="relative">
          <Button
            variant="outline"
            size="sm"
            className="text-xs h-8"
            onClick={() => setShowTemplates(!showTemplates)}
          >
            <FileText className="h-3 w-3 mr-1" />
            Templates
            <ChevronDown className="h-3 w-3 ml-1" />
          </Button>
          {showTemplates && (
            <div className="absolute bottom-full left-0 mb-1 w-[200px] rounded-lg border bg-popover shadow-lg overflow-hidden">
              <div className="px-3 py-2 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Templates
              </div>
              {EMAIL_TEMPLATES.map((tpl) => (
                <button
                  key={tpl.id}
                  onClick={() => applyTemplate(tpl)}
                  className="w-full text-left px-3 py-2 text-[13px] hover:bg-accent transition-colors"
                >
                  {tpl.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="text-xs h-8" onClick={onClose}>
            Discard
          </Button>
          <Button
            size="sm"
            className="text-xs h-8 opacity-45 cursor-not-allowed"
            disabled
            title="Sending coming soon"
          >
            <Send className="h-3 w-3 mr-1" />
            Send
            <span className="text-[9px] font-bold bg-white/20 rounded px-1 ml-1">
              SOON
            </span>
          </Button>
        </div>
      </div>
    </div>
  )

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
        <SheetContent side="bottom" className="max-h-[90vh] p-0">
          <SheetHeader className="px-4 pt-4 pb-2">
            <SheetTitle>New Email</SheetTitle>
          </SheetHeader>
          {content}
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[600px] p-0">
        <DialogHeader className="px-4 pt-4 pb-0">
          <DialogTitle className="text-[15px]">New Email</DialogTitle>
          <p className="text-xs text-muted-foreground">
            {validRecipients.length} recipient{validRecipients.length !== 1 ? "s" : ""}
          </p>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  )
}
