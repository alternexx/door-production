"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AppAgent } from "@/lib/mock-data";

interface ShowingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  users: AppAgent[];
  onConfirm: (date: string, agentId: string) => void;
}

export function ShowingDialog({
  open,
  onOpenChange,
  users,
  onConfirm,
}: ShowingDialogProps) {
  const [date, setDate] = useState("");
  const [agentId, setAgentId] = useState("");

  const handleCancel = () => {
    onOpenChange(false);
    setDate("");
    setAgentId("");
  };

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val) handleCancel(); else onOpenChange(val); }}>
      <DialogContent className="sm:max-w-[400px] bg-white">
        <DialogHeader>
          <DialogTitle>Schedule Showing</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Date & Time *</Label>
            <Input
              type="datetime-local"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Showing Agent</Label>
            <Select onValueChange={(v: string | null) => v && setAgentId(v)} value={agentId}>
              <SelectTrigger>
                <SelectValue placeholder="Select agent" />
              </SelectTrigger>
              <SelectContent>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button
              disabled={!date}
              className="bg-[#b45309] hover:bg-[#92400e] text-white"
              onClick={() => {
                onConfirm(date, agentId);
                onOpenChange(false);
                setDate("");
                setAgentId("");
              }}
            >
              Schedule
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
