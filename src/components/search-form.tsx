"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CalendarDays, Car, Footprints, MapPin } from "lucide-react";
import { addDays, defaultHikeDate, formatDayName, isPlannableDate, planWindow } from "@/lib/dates";
import { saveSettings, useSettings } from "@/lib/preferences";
import { DRIVE_OPTIONS, searchQuery, type Search } from "@/lib/search";
import { cn } from "@/lib/utils";
import { WALK_OPTIONS } from "@/lib/walks";

/** "overlay" sits on the landing photo; "panel" sits on a light background, like the edit-search dialog. */
type Variant = "overlay" | "panel";

export function SearchForm({
  initial,
  variant = "overlay",
  className,
  onSearch,
}: {
  initial: Search;
  variant?: Variant;
  className?: string;
  /** Called once the search has been sent to the results page. */
  onSearch?: () => void;
}) {
  const router = useRouter();
  const settings = useSettings();
  const [from, setFrom] = useState(initial.from);
  const [maxDrive, setMaxDrive] = useState(initial.maxDriveMinutes);
  const [walk, setWalk] = useState(initial.walk);
  const [date, setDate] = useState(initial.date);
  const [error, setError] = useState("");

  const saturday = defaultHikeDate();
  const weekend = [saturday, addDays(saturday, 1)].filter((d) => isPlannableDate(d));
  const [customDay, setCustomDay] = useState(!weekend.includes(initial.date));
  const range = planWindow();
  const panel = variant === "panel";

  return (
    <form
      noValidate
      className={cn("w-full max-w-2xl", className)}
      onSubmit={(e) => {
        e.preventDefault();
        const next = from.trim();
        if (!next) {
          setError("Enter a town, city or postcode to start from.");
          return;
        }
        // Remember it, so the next visit starts from the same place.
        saveSettings({ ...settings, from: next, maxDriveMinutes: maxDrive, walk });
        router.push(`/results?${searchQuery({ from: next, date, maxDriveMinutes: maxDrive, walk })}`);
        onSearch?.();
      }}
    >
      <div
        className={cn(
          "flex items-center gap-2 rounded-2xl bg-surface p-2 ring-2 transition-colors",
          panel ? "pl-4" : "pl-5 shadow-[0_12px_40px_rgba(20,24,14,0.35)]",
          error ? "ring-clay" : panel ? "ring-dune focus-within:ring-moss" : "ring-transparent focus-within:ring-moss",
        )}
      >
        <MapPin className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
        <label htmlFor="from" className="sr-only">
          Starting from
        </label>
        <input
          id="from"
          value={from}
          onChange={(e) => {
            setFrom(e.target.value);
            if (error) setError("");
          }}
          placeholder="Town, city or postcode"
          autoComplete="address-level2"
          enterKeyHint="go"
          aria-invalid={!!error}
          aria-describedby={error ? "from-error" : undefined}
          className="h-12 min-w-0 flex-1 bg-transparent text-lg text-bark outline-none placeholder:text-muted-foreground"
        />
        <button
          type="submit"
          aria-label="Find my summit"
          className="flex h-12 shrink-0 items-center gap-2 rounded-xl bg-clay px-4 font-semibold text-surface transition-colors hover:bg-clay-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay sm:px-6"
        >
          <span className={cn("hidden", !panel && "sm:inline")}>Find my summit</span>
          <ArrowRight className="size-5" />
        </button>
      </div>
      {error && (
        <p
          id="from-error"
          role="alert"
          className="mt-3 inline-block rounded-md bg-clay px-3 py-1 text-sm font-medium text-surface animate-in fade-in slide-in-from-top-1"
        >
          {error}
        </p>
      )}

      <div className={cn("space-y-3", panel ? "mt-5" : "mt-7")}>
        <ChipGroup label="Walking for" icon={<Footprints className="size-4" />} variant={variant}>
          {WALK_OPTIONS.map((o) => (
            <Chip key={o.label} selected={walk === o.value} onClick={() => setWalk(o.value)} variant={variant}>
              {o.label}
            </Chip>
          ))}
        </ChipGroup>
        <ChipGroup label="Drive up to" icon={<Car className="size-4" />} variant={variant}>
          {DRIVE_OPTIONS.map((o) => (
            <Chip key={o.label} selected={maxDrive === o.minutes} onClick={() => setMaxDrive(o.minutes)} variant={variant}>
              {o.label}
            </Chip>
          ))}
        </ChipGroup>
        <ChipGroup label="Hiking on" icon={<CalendarDays className="size-4" />} variant={variant}>
          {weekend.map((d) => (
            <Chip
              key={d}
              selected={!customDay && date === d}
              onClick={() => {
                setCustomDay(false);
                setDate(d);
              }}
              variant={variant}
            >
              {formatDayName(d, "short")}
            </Chip>
          ))}
          <Chip selected={customDay} onClick={() => setCustomDay(true)} variant={variant}>
            Another day
          </Chip>
          {customDay && (
            <>
              <label htmlFor="custom-date" className="sr-only">
                Choose a day
              </label>
              <input
                id="custom-date"
                type="date"
                value={date}
                min={range.first}
                max={range.last}
                onChange={(e) => isPlannableDate(e.target.value) && setDate(e.target.value)}
                className={cn(
                  "h-9 rounded-full bg-surface px-4 text-sm font-semibold text-pine outline-none focus-visible:ring-2",
                  panel ? "ring-1 ring-dune focus-visible:ring-moss" : "focus-visible:ring-white",
                )}
              />
            </>
          )}
        </ChipGroup>
      </div>
    </form>
  );
}

function ChipGroup({
  label,
  icon,
  variant,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  variant: Variant;
  children: React.ReactNode;
}) {
  const panel = variant === "panel";
  return (
    <div className={cn("flex flex-wrap items-center gap-x-3 gap-y-2", !panel && "justify-center")}>
      <span
        className={cn(
          "flex items-center gap-1.5 whitespace-nowrap text-sm font-medium",
          panel ? "text-muted-foreground" : "text-white/90",
        )}
      >
        {icon}
        {label}
      </span>
      <div role="group" aria-label={label} className={cn("flex flex-wrap gap-2", !panel && "justify-center")}>
        {children}
      </div>
    </div>
  );
}

function Chip({
  selected,
  onClick,
  variant,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  variant: Variant;
  children: React.ReactNode;
}) {
  const panel = variant === "panel";
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "h-9 whitespace-nowrap rounded-full px-4 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2",
        panel
          ? selected
            ? "bg-pine text-surface focus-visible:outline-moss"
            : "bg-surface text-bark ring-1 ring-inset ring-dune hover:bg-dune/40 focus-visible:outline-moss"
          : selected
            ? "bg-surface text-pine focus-visible:outline-white"
            : "bg-black/25 text-white ring-1 ring-inset ring-white/35 hover:bg-black/40 focus-visible:outline-white",
      )}
    >
      {children}
    </button>
  );
}
