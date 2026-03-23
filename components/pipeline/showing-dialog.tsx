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
                {/* Time picker — inline pill buttons */}
                <div className="border-t px-3 pt-3 pb-2 space-y-2">
                  {/* Hours */}
                  <div className="flex flex-wrap gap-1">
                    {HOURS.map((h) => (
                      <button
                        key={h}
                        type="button"
                        onClick={() => setHour(String(h))}
                        className={`h-7 w-9 rounded-md text-xs font-medium transition-colors ${
                          hour === String(h)
                            ? "bg-[#b45309] text-white"
                            : "bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                        }`}
                      >
                        {h}
                      </button>
                    ))}
                  </div>
                  {/* Minutes + AM/PM */}
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      {MINUTES.map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setMinute(m)}
                          className={`h-7 w-10 rounded-md text-xs font-medium transition-colors ${
                            minute === m
                              ? "bg-[#b45309] text-white"
                              : "bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                          }`}
                        >
                          :{m}
                        </button>
                      ))}
                    </div>
                    <div className="ml-auto flex gap-1">
                      {["AM", "PM"].map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setAmpm(p)}
                          className={`h-7 px-3 rounded-md text-xs font-medium transition-colors ${
                            ampm === p
                              ? "bg-[#b45309] text-white"
                              : "bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
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
