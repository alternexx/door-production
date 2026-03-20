"use client"

import React, { useState, useEffect, useCallback, useMemo } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Search,
  Plus,
  Loader2,
  Pencil,
  Trash2,
  Merge,
  Link2,
  Unlink2,
} from "lucide-react"
import { cn } from "@/lib/utils"

type DealLink = {
  id: string
  dealId: string
  role: string | null
  deal: {
    id: string
    title: string
    dealType: string
    address: string
  }
}

type Contact = {
  id: string
  fullName: string
  email: string | null
  phone: string | null
  createdAt: string
  deals: DealLink[]
}

type DealOption = {
  id: string
  title: string
  address: string
  dealType: string
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)

  const [editOpen, setEditOpen] = useState(false)
  const [editContact, setEditContact] = useState<Contact | null>(null)
  const [formName, setFormName] = useState("")
  const [formEmail, setFormEmail] = useState("")
  const [formPhone, setFormPhone] = useState("")
  const [saving, setSaving] = useState(false)

  const [mergeMode, setMergeMode] = useState(false)
  const [mergeSelected, setMergeSelected] = useState<Set<string>>(new Set())

  const [linkOpen, setLinkOpen] = useState(false)
  const [deals, setDeals] = useState<DealOption[]>([])
  const [dealsLoading, setDealsLoading] = useState(false)
  const [linkDealId, setLinkDealId] = useState("")
  const [linkRole, setLinkRole] = useState("")
  const [linking, setLinking] = useState(false)

  const fetchContacts = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/contacts?q=${encodeURIComponent(search)}`)
      if (res.ok) {
        const rows = await res.json()
        setContacts(rows)
        if (selectedContact) {
          const selected = rows.find((row: Contact) => row.id === selectedContact.id)
          setSelectedContact(selected ?? null)
        }
      }
    } finally {
      setLoading(false)
    }
  }, [search, selectedContact])

  const fetchDeals = useCallback(async () => {
    setDealsLoading(true)
    try {
      const res = await fetch("/api/deals?archived=true")
      if (!res.ok) return

      const rows = await res.json()
      setDeals(
        rows.map((deal: DealOption) => ({
          id: deal.id,
          title: deal.title,
          address: deal.address,
          dealType: deal.dealType,
        }))
      )
    } finally {
      setDealsLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(fetchContacts, 300)
    return () => clearTimeout(timer)
  }, [fetchContacts])

  const availableDeals = useMemo(() => {
    if (!selectedContact) return deals
    const linkedIds = new Set(selectedContact.deals.map((d) => d.dealId))
    return deals.filter((d) => !linkedIds.has(d.id))
  }, [deals, selectedContact])

  const openCreate = () => {
    setEditContact(null)
    setFormName("")
    setFormEmail("")
    setFormPhone("")
    setEditOpen(true)
  }

  const openEdit = (contact: Contact) => {
    setEditContact(contact)
    setFormName(contact.fullName)
    setFormEmail(contact.email ?? "")
    setFormPhone(contact.phone ?? "")
    setEditOpen(true)
  }

  const openLinkDeal = async () => {
    setLinkDealId("")
    setLinkRole("")
    setLinkOpen(true)
    await fetchDeals()
  }

  const handleSave = async () => {
    if (!formName.trim()) return
    setSaving(true)
    try {
      const body = {
        fullName: formName.trim(),
        email: formEmail.trim() || null,
        phone: formPhone.trim() || null,
      }

      if (editContact) {
        await fetch(`/api/contacts/${editContact.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
      } else {
        await fetch("/api/contacts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
      }
      setEditOpen(false)
      await fetchContacts()
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this contact?")) return
    await fetch(`/api/contacts/${id}`, { method: "DELETE" })
    if (selectedContact?.id === id) setSelectedContact(null)
    await fetchContacts()
  }

  const handleLink = async () => {
    if (!selectedContact || !linkDealId) return
    setLinking(true)
    try {
      const res = await fetch(`/api/contacts/${selectedContact.id}/link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dealId: linkDealId, role: linkRole.trim() || null }),
      })

      if (!res.ok) {
        const payload = await res.json().catch(() => null)
        alert(payload?.error ?? "Failed to link contact")
        return
      }

      setLinkOpen(false)
      await fetchContacts()
    } finally {
      setLinking(false)
    }
  }

  const handleUnlink = async (dealId: string) => {
    if (!selectedContact) return

    const res = await fetch(`/api/contacts/${selectedContact.id}/unlink`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dealId }),
    })

    if (!res.ok) {
      const payload = await res.json().catch(() => null)
      alert(payload?.error ?? "Failed to unlink contact")
      return
    }

    await fetchContacts()
  }

  const handleMerge = async () => {
    const ids = Array.from(mergeSelected)
    if (ids.length < 2) return
    const primaryId = ids[0]
    const mergeIds = ids.slice(1)

    await fetch("/api/contacts/merge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ primaryId, mergeIds }),
    })
    setMergeMode(false)
    setMergeSelected(new Set())
    await fetchContacts()
  }

  const toggleMergeSelect = (id: string) => {
    setMergeSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="flex h-full">
      <div className="flex flex-1 flex-col">
        <div className="flex items-center gap-3 border-b px-4 py-3">
          <h1 className="text-lg font-semibold">Contacts</h1>
          <div className="relative ml-auto max-w-xs flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search contacts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 pl-8 text-sm"
            />
          </div>
          <Button size="sm" className="h-8" onClick={openCreate}>
            <Plus className="mr-1 size-4" />
            New Contact
          </Button>
          <Button
            variant={mergeMode ? "default" : "outline"}
            size="sm"
            className="h-8"
            onClick={() => {
              if (mergeMode && mergeSelected.size >= 2) {
                handleMerge()
              } else {
                setMergeMode(!mergeMode)
                setMergeSelected(new Set())
              }
            }}
          >
            <Merge className="mr-1 size-4" />
            {mergeMode
              ? mergeSelected.size >= 2
                ? `Merge (${mergeSelected.size})`
                : "Select 2+"
              : "Merge"}
          </Button>
        </div>

        {loading ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="flex-1 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {mergeMode && <TableHead className="w-10" />}
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Deals</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {contacts.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={mergeMode ? 6 : 5}
                      className="py-8 text-center text-sm text-muted-foreground"
                    >
                      {search ? "No contacts match your search" : "No contacts yet"}
                    </TableCell>
                  </TableRow>
                ) : (
                  contacts.map((contact) => (
                    <TableRow
                      key={contact.id}
                      className={cn(
                        "cursor-pointer",
                        selectedContact?.id === contact.id && "bg-muted/50"
                      )}
                      onClick={() => setSelectedContact(contact)}
                    >
                      {mergeMode && (
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={mergeSelected.has(contact.id)}
                            onChange={() => toggleMergeSelect(contact.id)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </TableCell>
                      )}
                      <TableCell className="font-medium">
                        {contact.fullName}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {contact.email ?? "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {contact.phone ?? "—"}
                      </TableCell>
                      <TableCell>
                        {contact.deals.length > 0 ? (
                          <Badge variant="secondary" className="text-xs">
                            {contact.deals.length} deal
                            {contact.deals.length !== 1 ? "s" : ""}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            None
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              openEdit(contact)
                            }}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <Pencil className="size-3.5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDelete(contact.id)
                            }}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {selectedContact && (
        <div className="w-80 border-l">
          <div className="border-b px-4 py-3">
            <h2 className="font-semibold">{selectedContact.fullName}</h2>
            {selectedContact.email && (
              <p className="text-sm text-muted-foreground">
                {selectedContact.email}
              </p>
            )}
            {selectedContact.phone && (
              <p className="text-sm text-muted-foreground">
                {selectedContact.phone}
              </p>
            )}
          </div>
          <div className="p-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-medium">Linked Deals</h3>
              <Button size="sm" variant="outline" className="h-7" onClick={openLinkDeal}>
                <Link2 className="mr-1 size-3.5" />
                Link Deal
              </Button>
            </div>
            {selectedContact.deals.length === 0 ? (
              <p className="text-sm text-muted-foreground">No linked deals</p>
            ) : (
              <div className="space-y-2">
                {selectedContact.deals.map((link) => (
                  <div
                    key={link.id}
                    className="flex items-center gap-2 rounded-lg border p-2"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium">{link.deal.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {link.deal.address}
                      </p>
                    </div>
                    {link.role && (
                      <Badge variant="secondary" className="text-[10px]">
                        {link.role}
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-[10px]">
                      {link.deal.dealType}
                    </Badge>
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => handleUnlink(link.dealId)}
                      title="Unlink from this deal"
                    >
                      <Unlink2 className="size-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editContact ? "Edit Contact" : "New Contact"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Full Name</Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="John Doe"
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                placeholder="john@example.com"
              />
            </div>
            <div>
              <Label>Phone</Label>
              <Input
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
                placeholder="(555) 123-4567"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setEditOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving || !formName.trim()}
              >
                {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
                {editContact ? "Save" : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Link Contact To Deal</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Deal</Label>
              <Select value={linkDealId} onValueChange={(v: unknown) => typeof v === "string" && setLinkDealId(v)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={dealsLoading ? "Loading deals..." : "Select a deal"} />
                </SelectTrigger>
                <SelectContent>
                  {availableDeals.length === 0 ? (
                    <SelectItem value="none" disabled>
                      No available deals
                    </SelectItem>
                  ) : (
                    availableDeals.map((deal) => (
                      <SelectItem key={deal.id} value={deal.id}>
                        {deal.title} - {deal.address}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Role (optional)</Label>
              <Input
                value={linkRole}
                onChange={(e) => setLinkRole(e.target.value)}
                placeholder="Buyer, Seller, Tenant, Landlord..."
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setLinkOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleLink} disabled={linking || !linkDealId || linkDealId === "none"}>
                {linking && <Loader2 className="mr-2 size-4 animate-spin" />}
                Link
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
