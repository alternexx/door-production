"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2 } from "lucide-react"

type RenewalRow = {
  id: string
  title: string
  address: string
  unit: string | null
  leaseEndDate: string
  daysUntilExpiry: number
}

function formatLeaseDate(value: string) {
  return new Date(`${value}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function expiryTone(daysUntilExpiry: number) {
  if (daysUntilExpiry <= 7) return "destructive"
  if (daysUntilExpiry <= 30) return "secondary"
  return "outline"
}

function expiryLabel(daysUntilExpiry: number) {
  if (daysUntilExpiry === 0) return "Expires today"
  if (daysUntilExpiry === 1) return "1 day left"
  return `${daysUntilExpiry} days left`
}

export function RenewalRadarWidget() {
  const [rows, setRows] = useState<RenewalRow[]>([])
  const [loading, setLoading] = useState(true)
  const [convertingId, setConvertingId] = useState<string | null>(null)
  const [createdFrom, setCreatedFrom] = useState<Set<string>>(new Set())

  const load = async () => {
    try {
      const res = await fetch("/api/renewals")
      if (!res.ok) return
      const data = await res.json()
      setRows(Array.isArray(data) ? data : [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const sortedRows = useMemo(
    () => [...rows].sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry),
    [rows]
  )

  const createRenewalDeal = async (dealId: string) => {
    try {
      setConvertingId(dealId)
      const res = await fetch(`/api/renewals/${dealId}/convert`, { method: "POST" })
      if (!res.ok) return

      setCreatedFrom((prev) => {
        const next = new Set(prev)
        next.add(dealId)
        return next
      })
    } finally {
      setConvertingId(null)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Renewal Radar</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          </div>
        ) : sortedRows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No lease expirations in the next 90 days.</p>
        ) : (
          sortedRows.map((row) => {
            const isCreated = createdFrom.has(row.id)
            const isBusy = convertingId === row.id

            return (
              <div key={row.id} className="rounded-md border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 space-y-1">
                    <p className="truncate text-sm font-medium">{row.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {row.address}
                      {row.unit ? `, Unit ${row.unit}` : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">Lease ends {formatLeaseDate(row.leaseEndDate)}</p>
                  </div>
                  <Badge variant={expiryTone(row.daysUntilExpiry)}>{expiryLabel(row.daysUntilExpiry)}</Badge>
                </div>

                <div className="mt-3 flex justify-end">
                  <Button
                    size="sm"
                    onClick={() => createRenewalDeal(row.id)}
                    disabled={isBusy || isCreated}
                  >
                    {isBusy ? <Loader2 className="size-4 animate-spin" /> : isCreated ? "Renewal Created" : "Create Renewal Deal"}
                  </Button>
                </div>
              </div>
            )
          })
        )}
      </CardContent>
    </Card>
  )
}
