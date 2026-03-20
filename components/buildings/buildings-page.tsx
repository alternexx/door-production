"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
import { Loader2, Pencil, Plus, Search } from "lucide-react";
import { toast } from "sonner";

interface Building {
  id: string;
  address: string;
  borough: string;
  neighborhood: string | null;
  zip: string | null;
  landlordId: string | null;
  keyAccess: string | null;
  ownerName: string | null;
  ownerPhone: string | null;
  ownerEmail: string | null;
  managementCompany: string | null;
  amenities: string[] | null;
  landlord?: {
    id: string;
    name: string;
  } | null;
  createdAt: string;
  updatedAt: string;
  dealCount?: number;
}

interface LandlordOption {
  id: string;
  name: string;
}

interface BuildingForm {
  address: string;
  borough: string;
  neighborhood: string;
  zip: string;
  landlordId: string;
  keyAccess: string;
  ownerName: string;
  ownerPhone: string;
  ownerEmail: string;
  managementCompany: string;
  amenities: string;
}

const EMPTY_FORM: BuildingForm = {
  address: "",
  borough: "",
  neighborhood: "",
  zip: "",
  landlordId: "",
  keyAccess: "",
  ownerName: "",
  ownerPhone: "",
  ownerEmail: "",
  managementCompany: "",
  amenities: "",
};

function toForm(building: Building): BuildingForm {
  return {
    address: building.address ?? "",
    borough: building.borough ?? "",
    neighborhood: building.neighborhood ?? "",
    zip: building.zip ?? "",
    landlordId: building.landlordId ?? "",
    keyAccess: building.keyAccess ?? "",
    ownerName: building.ownerName ?? "",
    ownerPhone: building.ownerPhone ?? "",
    ownerEmail: building.ownerEmail ?? "",
    managementCompany: building.managementCompany ?? "",
    amenities: Array.isArray(building.amenities) ? building.amenities.join("\n") : "",
  };
}

function toPayload(form: BuildingForm) {
  const trimmedAmenities = form.amenities
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);

  return {
    address: form.address,
    borough: form.borough,
    neighborhood: form.neighborhood,
    zip: form.zip,
    landlordId: form.landlordId || null,
    keyAccess: form.keyAccess,
    ownerName: form.ownerName,
    ownerPhone: form.ownerPhone,
    ownerEmail: form.ownerEmail,
    managementCompany: form.managementCompany,
    amenities: trimmedAmenities,
  };
}

export function BuildingsPage() {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [landlords, setLandlords] = useState<LandlordOption[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Building | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<BuildingForm>(EMPTY_FORM);

  const fetchBuildings = useCallback(async (query: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/buildings?q=${encodeURIComponent(query)}`);
      if (!res.ok) {
        throw new Error("Failed to fetch buildings");
      }
      const data = (await res.json()) as Building[];
      setBuildings(data);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load buildings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchBuildings(search);
    }, 250);

    return () => clearTimeout(timer);
  }, [search, fetchBuildings]);

  useEffect(() => {
    fetch("/api/landlords")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data)) {
          setLandlords(
            data
              .filter(
                (item): item is LandlordOption =>
                  typeof item?.id === "string" && typeof item?.name === "string"
              )
              .map((item) => ({ id: item.id, name: item.name }))
          );
        } else {
          setLandlords([]);
        }
      })
      .catch(() => setLandlords([]));
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (building: Building) => {
    setEditing(building);
    setForm(toForm(building));
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.address.trim() || !form.borough.trim()) {
      toast.error("Address and borough are required");
      return;
    }

    setSaving(true);
    try {
      const payload = toPayload(form);
      const res = await fetch(
        editing ? `/api/buildings/${editing.id}` : "/api/buildings",
        {
          method: editing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error || "Failed to save building");
      }

      toast.success(editing ? "Building updated" : "Building created");
      setModalOpen(false);
      setEditing(null);
      setForm(EMPTY_FORM);
      await fetchBuildings(search);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Failed to save building");
    } finally {
      setSaving(false);
    }
  };

  const rows = useMemo(() => buildings, [buildings]);

  return (
    <div className="h-full overflow-auto">
      <div className="flex items-center gap-3 border-b border-border/50 px-4 py-2.5">
        <h1 className="text-[18px] font-semibold">Buildings</h1>
        <div className="relative ml-auto max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by address, borough, owner..."
            className="h-8 pl-8"
          />
        </div>
        <Button size="sm" className="h-8" onClick={openCreate}>
          <Plus className="mr-1 size-4" />
          New Building
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
                  <TableHead>Address</TableHead>
                  <TableHead>Borough</TableHead>
                  <TableHead>Neighborhood</TableHead>
                  <TableHead>ZIP</TableHead>
                  <TableHead>Landlord</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead className="text-right">Deals</TableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-28 text-center text-muted-foreground">
                      No buildings found
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((building) => (
                    <TableRow key={building.id}>
                      <TableCell className="font-medium">{building.address}</TableCell>
                      <TableCell>{building.borough}</TableCell>
                      <TableCell>{building.neighborhood || "-"}</TableCell>
                      <TableCell>{building.zip || "-"}</TableCell>
                      <TableCell>{building.landlord?.name || "-"}</TableCell>
                      <TableCell>{building.ownerName || "-"}</TableCell>
                      <TableCell>{building.managementCompany || "-"}</TableCell>
                      <TableCell className="text-right">{building.dealCount || 0}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          onClick={() => openEdit(building)}
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

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Building" : "Create Building"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <div className="col-span-2 space-y-1">
              <Label htmlFor="building-address">Address</Label>
              <Input
                id="building-address"
                value={form.address}
                onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
                placeholder="123 Main St"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="building-borough">Borough</Label>
              <Input
                id="building-borough"
                value={form.borough}
                onChange={(e) => setForm((prev) => ({ ...prev, borough: e.target.value }))}
                placeholder="Manhattan"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="building-neighborhood">Neighborhood</Label>
              <Input
                id="building-neighborhood"
                value={form.neighborhood}
                onChange={(e) => setForm((prev) => ({ ...prev, neighborhood: e.target.value }))}
                placeholder="Upper East Side"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="building-zip">ZIP</Label>
              <Input
                id="building-zip"
                value={form.zip}
                onChange={(e) => setForm((prev) => ({ ...prev, zip: e.target.value }))}
                placeholder="10021"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="building-key">Key Access</Label>
              <Input
                id="building-key"
                value={form.keyAccess}
                onChange={(e) => setForm((prev) => ({ ...prev, keyAccess: e.target.value }))}
                placeholder="Doorman / lockbox details"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="building-landlord">Landlord</Label>
              <Select
                value={form.landlordId || "__none__"}
                onValueChange={(value: unknown) => {
                  if (typeof value !== "string") return;
                  setForm((prev) => ({ ...prev, landlordId: value === "__none__" ? "" : value }));
                }}
              >
                <SelectTrigger id="building-landlord">
                  <SelectValue placeholder="Select landlord" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No landlord</SelectItem>
                  {landlords.map((landlord) => (
                    <SelectItem key={landlord.id} value={landlord.id}>
                      {landlord.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="building-owner">Owner Name</Label>
              <Input
                id="building-owner"
                value={form.ownerName}
                onChange={(e) => setForm((prev) => ({ ...prev, ownerName: e.target.value }))}
                placeholder="Owner name"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="building-owner-phone">Owner Phone</Label>
              <Input
                id="building-owner-phone"
                value={form.ownerPhone}
                onChange={(e) => setForm((prev) => ({ ...prev, ownerPhone: e.target.value }))}
                placeholder="(212) 555-0100"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="building-owner-email">Owner Email</Label>
              <Input
                id="building-owner-email"
                value={form.ownerEmail}
                onChange={(e) => setForm((prev) => ({ ...prev, ownerEmail: e.target.value }))}
                placeholder="owner@example.com"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="building-management">Management Company</Label>
              <Input
                id="building-management"
                value={form.managementCompany}
                onChange={(e) => setForm((prev) => ({ ...prev, managementCompany: e.target.value }))}
                placeholder="Management company"
              />
            </div>
            <div className="col-span-2 space-y-1">
              <Label htmlFor="building-amenities">Amenities (one per line)</Label>
              <textarea
                id="building-amenities"
                value={form.amenities}
                onChange={(e) => setForm((prev) => ({ ...prev, amenities: e.target.value }))}
                className="w-full min-h-[90px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                placeholder="Laundry\nGym\nRoof Deck"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-1.5 size-4 animate-spin" />}
              {editing ? "Save Changes" : "Create Building"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
