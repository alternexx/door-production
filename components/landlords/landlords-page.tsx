"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Pencil, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type LandlordRow = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  preferredContact: string | null;
  managementCompany: string | null;
  notes: string | null;
  coBroke: boolean;
  coBrokeTerms: string | null;
  buildingCount: number;
  dealCount: number;
  createdAt: string;
  updatedAt: string;
};

type LandlordBuilding = {
  id: string;
  address: string;
  borough: string;
  neighborhood: string | null;
  zip: string | null;
  dealCount?: number;
};

type LandlordDeal = {
  id: string;
  title: string;
  address: string;
  dealType: string;
  status: string;
  updatedAt: string;
  buildingAddress: string;
  stage?: { name?: string | null } | null;
};

type LandlordDetail = LandlordRow & {
  buildings: LandlordBuilding[];
  dealHistory: LandlordDeal[];
};

type LandlordForm = {
  name: string;
  phone: string;
  email: string;
  preferredContact: string;
  managementCompany: string;
  notes: string;
  coBroke: boolean;
  coBrokeTerms: string;
};

const EMPTY_FORM: LandlordForm = {
  name: "",
  phone: "",
  email: "",
  preferredContact: "",
  managementCompany: "",
  notes: "",
  coBroke: false,
  coBrokeTerms: "",
};

function toForm(landlord: LandlordRow): LandlordForm {
  return {
    name: landlord.name ?? "",
    phone: landlord.phone ?? "",
    email: landlord.email ?? "",
    preferredContact: landlord.preferredContact ?? "",
    managementCompany: landlord.managementCompany ?? "",
    notes: landlord.notes ?? "",
    coBroke: landlord.coBroke,
    coBrokeTerms: landlord.coBrokeTerms ?? "",
  };
}

function toPayload(form: LandlordForm) {
  return {
    name: form.name,
    phone: form.phone,
    email: form.email,
    preferredContact: form.preferredContact,
    managementCompany: form.managementCompany,
    notes: form.notes,
    coBroke: form.coBroke,
    coBrokeTerms: form.coBrokeTerms,
  };
}

export function LandlordsPage() {
  const [landlords, setLandlords] = useState<LandlordRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<LandlordDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<LandlordRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<LandlordForm>(EMPTY_FORM);

  const fetchLandlords = useCallback(async (query: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/landlords?q=${encodeURIComponent(query)}`);
      if (!res.ok) {
        throw new Error("Failed to fetch landlords");
      }
      const data = (await res.json()) as LandlordRow[];
      setLandlords(data);

      if (!selectedId && data.length > 0) {
        setSelectedId(data[0].id);
      } else if (selectedId && !data.find((item) => item.id === selectedId)) {
        setSelectedId(data[0]?.id ?? null);
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to load landlords");
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  const fetchLandlordDetail = useCallback(async (id: string) => {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/landlords/${id}`);
      if (!res.ok) {
        throw new Error("Failed to fetch landlord details");
      }
      const data = (await res.json()) as LandlordDetail;
      setDetail(data);
    } catch (error) {
      console.error(error);
      setDetail(null);
      toast.error("Failed to load landlord details");
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchLandlords(search);
    }, 250);
    return () => clearTimeout(timer);
  }, [search, fetchLandlords]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    fetchLandlordDetail(selectedId);
  }, [selectedId, fetchLandlordDetail]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (landlord: LandlordRow) => {
    setEditing(landlord);
    setForm(toForm(landlord));
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(editing ? `/api/landlords/${editing.id}` : "/api/landlords", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toPayload(form)),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error || "Failed to save landlord");
      }

      const payload = (await res.json().catch(() => null)) as { id?: string } | null;

      toast.success(editing ? "Landlord updated" : "Landlord created");
      setModalOpen(false);
      setEditing(null);
      setForm(EMPTY_FORM);
      await fetchLandlords(search);

      const nextId = editing?.id ?? payload?.id ?? null;
      if (nextId) {
        setSelectedId(nextId);
      }
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Failed to save landlord");
    } finally {
      setSaving(false);
    }
  };

  const rows = useMemo(() => landlords, [landlords]);

  return (
    <div className="flex h-full">
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-3 border-b border-border/50 px-4 py-2.5">
          <h1 className="text-[18px] font-semibold">Landlords</h1>
          <div className="relative ml-auto max-w-sm flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, phone, email, company..."
              className="h-8 pl-8"
            />
          </div>
          <Button size="sm" className="h-8" onClick={openCreate}>
            <Plus className="mr-1 size-4" />
            New Landlord
          </Button>
        </div>

        {loading ? (
          <div className="flex h-[260px] items-center justify-center">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="px-4 py-3">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Co-Broke</TableHead>
                    <TableHead className="text-right">Buildings</TableHead>
                    <TableHead className="text-right">Deals</TableHead>
                    <TableHead className="w-20" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-28 text-center text-muted-foreground">
                        No landlords found
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map((landlord) => (
                      <TableRow
                        key={landlord.id}
                        className={cn("cursor-pointer", selectedId === landlord.id && "bg-muted/40")}
                        onClick={() => setSelectedId(landlord.id)}
                      >
                        <TableCell className="font-medium">{landlord.name}</TableCell>
                        <TableCell>
                          <div className="text-sm">{landlord.phone || landlord.email || "-"}</div>
                          <div className="text-xs text-muted-foreground">{landlord.preferredContact || "-"}</div>
                        </TableCell>
                        <TableCell>{landlord.managementCompany || "-"}</TableCell>
                        <TableCell>
                          {landlord.coBroke ? (
                            <Badge variant="secondary" className="text-xs">Yes</Badge>
                          ) : (
                            <span className="text-sm text-muted-foreground">No</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">{landlord.buildingCount || 0}</TableCell>
                        <TableCell className="text-right">{landlord.dealCount || 0}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              openEdit(landlord);
                            }}
                          >
                            <Pencil className="size-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>

      <div className="w-[360px] border-l">
        {detailLoading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : !detail ? (
          <div className="p-4 text-sm text-muted-foreground">Select a landlord to view details.</div>
        ) : (
          <div className="h-full overflow-auto">
            <div className="border-b px-4 py-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="font-semibold">{detail.name}</h2>
                  <p className="text-sm text-muted-foreground">{detail.managementCompany || "No company"}</p>
                </div>
                <Button variant="outline" size="sm" className="h-8" onClick={() => openEdit(detail)}>
                  <Pencil className="mr-1 size-3.5" />
                  Edit
                </Button>
              </div>
              <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                <p>{detail.phone || "No phone"}</p>
                <p>{detail.email || "No email"}</p>
                <p>Preferred: {detail.preferredContact || "-"}</p>
              </div>
            </div>

            <div className="space-y-4 p-4">
              <section>
                <h3 className="mb-2 text-sm font-medium">Linked Buildings</h3>
                {detail.buildings.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No linked buildings</p>
                ) : (
                  <div className="space-y-2">
                    {detail.buildings.map((building) => (
                      <div key={building.id} className="rounded-md border p-2">
                        <p className="text-sm font-medium">{building.address}</p>
                        <p className="text-xs text-muted-foreground">
                          {building.borough}
                          {building.neighborhood ? ` • ${building.neighborhood}` : ""}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Deals: {building.dealCount || 0}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section>
                <h3 className="mb-2 text-sm font-medium">Deal History</h3>
                {detail.dealHistory.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No deal history</p>
                ) : (
                  <div className="space-y-2">
                    {detail.dealHistory.slice(0, 20).map((deal) => (
                      <div key={deal.id} className="rounded-md border p-2">
                        <p className="text-sm font-medium">{deal.title}</p>
                        <p className="text-xs text-muted-foreground">{deal.buildingAddress}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {deal.dealType} • {deal.stage?.name || "No stage"} • {deal.status}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </div>
        )}
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Landlord" : "Create Landlord"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <div className="col-span-2 space-y-1">
              <Label htmlFor="landlord-name">Name</Label>
              <Input
                id="landlord-name"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Landlord name"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="landlord-phone">Phone</Label>
              <Input
                id="landlord-phone"
                value={form.phone}
                onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                placeholder="(212) 555-0100"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="landlord-email">Email</Label>
              <Input
                id="landlord-email"
                value={form.email}
                onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="owner@example.com"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="landlord-preferred">Preferred Contact</Label>
              <Select
                value={form.preferredContact || "__none__"}
                onValueChange={(value: unknown) => {
                  if (typeof value !== "string") return;
                  setForm((prev) => ({
                    ...prev,
                    preferredContact: value === "__none__" ? "" : value,
                  }));
                }}
              >
                <SelectTrigger id="landlord-preferred">
                  <SelectValue placeholder="Select preferred contact" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No preference</SelectItem>
                  <SelectItem value="phone">Phone</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="text">Text</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="landlord-company">Management Company</Label>
              <Input
                id="landlord-company"
                value={form.managementCompany}
                onChange={(e) => setForm((prev) => ({ ...prev, managementCompany: e.target.value }))}
                placeholder="Management company"
              />
            </div>
            <div className="col-span-2 flex items-center gap-2 rounded-md border p-2.5">
              <Checkbox
                id="landlord-cobroke"
                checked={form.coBroke}
                onCheckedChange={(checked) =>
                  setForm((prev) => ({ ...prev, coBroke: checked === true }))
                }
              />
              <Label htmlFor="landlord-cobroke" className="cursor-pointer">Co-broke allowed</Label>
            </div>
            <div className="col-span-2 space-y-1">
              <Label htmlFor="landlord-cobroke-terms">Co-broke Terms</Label>
              <Textarea
                id="landlord-cobroke-terms"
                value={form.coBrokeTerms}
                onChange={(e) => setForm((prev) => ({ ...prev, coBrokeTerms: e.target.value }))}
                placeholder="Commission split, conditions, exclusions..."
                rows={3}
              />
            </div>
            <div className="col-span-2 space-y-1">
              <Label htmlFor="landlord-notes">Notes</Label>
              <Textarea
                id="landlord-notes"
                value={form.notes}
                onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="General notes"
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-1.5 size-4 animate-spin" />}
              {editing ? "Save Changes" : "Create Landlord"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
