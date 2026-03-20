"use client"

import React, { useState, useEffect, useCallback } from "react"
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandItem,
  CommandGroup,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { UserPlus, X, Loader2 } from "lucide-react"

type Contact = {
  id: string
  fullName: string
  email: string | null
  phone: string | null
}

type LinkedContact = Contact & {
  linkId: string
  role: string | null
}

export function ContactPicker({
  dealId,
  linkedContacts,
  onLink,
  onUnlink,
}: {
  dealId: string
  linkedContacts: LinkedContact[]
  onLink: (contactId: string) => Promise<void>
  onUnlink: (contactId: string) => Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState("")
  const [linking, setLinking] = useState<string | null>(null)

  const fetchContacts = useCallback(async (q: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/contacts?q=${encodeURIComponent(q)}`)
      if (res.ok) setContacts(await res.json())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open) {
      fetchContacts(search)
    }
  }, [open, search, fetchContacts])

  const linkedIds = new Set(linkedContacts.map((c) => c.id))

  const handleSelect = async (contactId: string) => {
    if (linkedIds.has(contactId)) return
    setLinking(contactId)
    try {
      await onLink(contactId)
      setOpen(false)
    } finally {
      setLinking(null)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1">
        {linkedContacts.map((contact) => (
          <Badge
            key={contact.id}
            variant="secondary"
            className="gap-1 pr-1 text-xs"
          >
            {contact.fullName}
            <button
              onClick={() => onUnlink(contact.id)}
              className="ml-0.5 rounded-full hover:bg-muted"
            >
              <X className="size-3" />
            </button>
          </Badge>
        ))}
      </div>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs text-foreground hover:bg-muted"
        >
          <UserPlus className="size-3" />
          Link Contact
        </PopoverTrigger>
        <PopoverContent className="w-64 p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Search contacts..."
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              {loading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="size-4 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  <CommandEmpty>No contacts found</CommandEmpty>
                  <CommandGroup>
                    {contacts.map((contact) => (
                      <CommandItem
                        key={contact.id}
                        value={contact.id}
                        onSelect={() => handleSelect(contact.id)}
                        disabled={
                          linkedIds.has(contact.id) || linking === contact.id
                        }
                      >
                        <div className="flex flex-col">
                          <span className="text-sm">{contact.fullName}</span>
                          {contact.email && (
                            <span className="text-[10px] text-muted-foreground">
                              {contact.email}
                            </span>
                          )}
                        </div>
                        {linkedIds.has(contact.id) && (
                          <span className="ml-auto text-[10px] text-muted-foreground">
                            Linked
                          </span>
                        )}
                        {linking === contact.id && (
                          <Loader2 className="ml-auto size-3 animate-spin" />
                        )}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}
