"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { DEFAULT_SETTINGS, type Settings } from "@/lib/preferences";
import type { Weights } from "@/lib/scoring";

const WEIGHT_LABELS: { key: keyof Weights; label: string; hint: string }[] = [
  { key: "weather", label: "Weather", hint: "Dry, calm and clear on the summit" },
  { key: "travel", label: "Travel", hint: "Less time in the car" },
  { key: "quality", label: "Hike quality", hint: "Bigger, more memorable mountain days" },
];

export function SettingsDialog({
  open,
  onOpenChange,
  settings,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: Settings;
  onSave: (s: Settings) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {open && <SettingsForm initial={settings} onSave={onSave} onCancel={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function SettingsForm({
  initial,
  onSave,
  onCancel,
}: {
  initial: Settings;
  onSave: (s: Settings) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(initial);
  const total = draft.weights.weather + draft.weights.travel + draft.weights.quality || 1;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave(draft);
      }}
      className="grid gap-5"
    >
      <DialogHeader>
        <DialogTitle>Your preferences</DialogTitle>
        <DialogDescription>Saved in this browser only.</DialogDescription>
      </DialogHeader>

      <fieldset className="grid gap-4">
        <legend className="mb-1 text-sm font-medium">What matters most?</legend>
        {WEIGHT_LABELS.map(({ key, label, hint }) => (
          <div key={key} className="grid gap-2">
            <div className="flex items-baseline justify-between text-sm">
              <span>
                {label} <span className="text-xs text-muted-foreground">· {hint}</span>
              </span>
              <span className="tabular-nums text-muted-foreground">{Math.round((draft.weights[key] / total) * 100)}%</span>
            </div>
            <Slider
              aria-label={label}
              min={0}
              max={100}
              step={5}
              value={[draft.weights[key]]}
              onValueChange={(v) => {
                const n = Array.isArray(v) ? v[0] : v;
                setDraft({ ...draft, weights: { ...draft.weights, [key]: n } });
              }}
            />
          </div>
        ))}
      </fieldset>

      <DialogFooter className="gap-2 sm:justify-between">
        <Button type="button" variant="ghost" onClick={() => setDraft({ ...draft, weights: DEFAULT_SETTINGS.weights })}>
          Reset to defaults
        </Button>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">Save</Button>
        </div>
      </DialogFooter>
    </form>
  );
}
