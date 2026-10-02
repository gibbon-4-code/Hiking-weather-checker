"use client";

import { useState } from "react";
import { CalendarDays, Car, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { formatDuration, planWindow } from "@/lib/dates";

const MIN_DRIVE = 30;
const MAX_DRIVE = 360;
const STEP = 15;
/** One notch past six hours means "no limit". */
const NO_LIMIT = MAX_DRIVE + STEP;

/** The three questions the whole page answers: where from, how far, and which day. */
export function PlannerBar({
  from,
  onFromChange,
  maxDriveMinutes,
  onMaxDriveChange,
  date,
  onDateChange,
}: {
  from: string;
  onFromChange: (from: string) => void;
  maxDriveMinutes: number | null;
  onMaxDriveChange: (minutes: number | null) => void;
  date: string;
  onDateChange: (date: string) => void;
}) {
  const range = planWindow();
  const sliderValue = maxDriveMinutes === null ? NO_LIMIT : Math.min(maxDriveMinutes, MAX_DRIVE);

  return (
    <section className="grid gap-4 rounded-xl border bg-card p-4 sm:grid-cols-[1.2fr_1.4fr_auto] sm:items-end">
      {/* Keyed on `from` so the box resets if the saved value changes in another tab. */}
      <FromField key={from} initial={from} onSubmit={onFromChange} />

      <div className="grid gap-3">
        <div className="flex items-baseline justify-between">
          <Label id="max-drive-label" className="text-muted-foreground">
            <Car className="size-4" /> Max drive
          </Label>
          <span className="text-sm font-medium tabular-nums">
            {maxDriveMinutes === null ? "No limit" : formatDuration(maxDriveMinutes)}
          </span>
        </div>
        <Slider
          aria-labelledby="max-drive-label"
          min={MIN_DRIVE}
          max={NO_LIMIT}
          step={STEP}
          value={[sliderValue]}
          getAriaValueText={(_, n) => (n >= NO_LIMIT ? "No limit" : formatDuration(n))}
          onValueChange={(v) => {
            const n = Array.isArray(v) ? v[0] : v;
            onMaxDriveChange(n >= NO_LIMIT ? null : n);
          }}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="hike-date" className="text-muted-foreground">
          <CalendarDays className="size-4" /> Hiking on
        </Label>
        <Input
          id="hike-date"
          type="date"
          className="sm:w-44"
          value={date}
          min={range.first}
          max={range.last}
          onChange={(e) => onDateChange(e.target.value)}
        />
      </div>
    </section>
  );
}

function FromField({ initial, onSubmit }: { initial: string; onSubmit: (from: string) => void }) {
  const [draft, setDraft] = useState(initial);
  return (
    <form
      className="grid gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const next = draft.trim();
        if (next && next !== initial) onSubmit(next);
      }}
    >
      <Label htmlFor="from" className="text-muted-foreground">
        <MapPin className="size-4" /> Starting from
      </Label>
      <div className="flex gap-2">
        <Input
          id="from"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Postcode or town"
          autoComplete="off"
          enterKeyHint="go"
        />
        <Button type="submit" variant="outline" disabled={!draft.trim() || draft.trim() === initial}>
          Go
        </Button>
      </div>
    </form>
  );
}
