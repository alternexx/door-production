"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import type { AppAgent } from "@/lib/app-types";

interface ShowingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  users: AppAgent[];
  onConfirm: (date: string, agentId: string) => void;
}

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = ["00", "15", "30", "45"];

export function ShowingDialog({
  open,
  onOpenChange,
  users,
  onConfirm,
}: ShowingDialogProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [hour, setHour] = useState("12");
  const [minute, setMinute] = useState("00");
  const [ampm, setAmpm] = useState("PM");
  const [agentId, setAgentId] = useState("");
  const [calendarOpen, setCalendarOpen] = useState(false);

  const handleCancel = () => {
    onOpenChange(false);
    setSelectedDate(undefined);
    setHour("12");
    setMinute("00");
    setAmpm("PM");
    setAgentId("");
  };

  const buildDatetimeString = (): string => {
    if (!selectedDate) return "";
    const h = parseInt(hour);
    const h24 = ampm === "AM" ? (h === 12 ? 0 : h) : (h === 12 ? 12 : h + 12);
    const d = new Date(selectedDate);
    d.setHours(h24, parseInt(minute), 0, 0);
    // Format as "YYYY-MM-DDTHH:mm" to match datetime-local format
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const min = String(d.getMinutes()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
  };

  const formattedDisplay = selectedDate
    ? `${format(selectedDate, "MMM d, yyyy")} · ${hour}:${minute} ${ampm}`
    : undefined;

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val) handleCancel(); else onOpenChange(val); }}>
      <DialogContent className="sm:max-w-[400px] bg-white">
        <DialogHeader>
          <DialogTitle>Schedule Showing</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Date & Time *</Label>
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger
                className="flex h-9 w-full items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm text-left"
              >
                <CalendarIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                {formattedDisplay ? (
                  <span>{formattedDisplay}</span>
                ) : (
                  <span className="text-muted-foreground">Pick a date & time</span>
                )}
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => {
                    setSelectedDate(date ?? undefined);
                  }}
                  classNames={{
                    today: "bg-[#b45309]/20 text-foreground",
                    day: "group/day relative aspect-square h-full w-full rounded-md p-0 text-center select-none data-[selected=true]:bg-[#b45309] data-[selected=true]:text-white",
                  }}
                />
                <div className="border-t px-3 py-2 flex items-center gap-2">
                  <Select value={hour} onValueChange={(v) => v && setHour(v)}>
                    <SelectTrigger className="w-[68px] h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {HOURS.map((h) => (
                        <SelectItem key={h} value={String(h)}>{String(h)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="text-sm text-muted-foreground">:</span>
                  <Select value={minute} onValueChange={(v) => v && setMinute(v)}>
                    <SelectTrigger className="w-[68px] h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MINUTES.map((m) => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={ampm} onValueChange={(v) => v && setAmpm(v)}>
                    <SelectTrigger className="w-[68px] h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AM">AM</SelectItem>
                      <SelectItem value="PM">PM</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </PopoverContent>
            </Popover>
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
              disabled={!selectedDate}
              className="bg-[#b45309] hover:bg-[#92400e] text-white"
              onClick={() => {
                onConfirm(buildDatetimeString(), agentId);
                onOpenChange(false);
                setSelectedDate(undefined);
                setHour("12");
                setMinute("00");
                setAmpm("PM");
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
