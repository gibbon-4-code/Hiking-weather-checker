"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CalendarDays, Car, MapPin } from "lucide-react";
import type { Viewer } from "@/auth";
import { AppHeader } from "@/components/app-header";
import { HillPhoto, PhotoCredit } from "@/components/hill-photo";
import { SettingsDialog } from "@/components/settings-dialog";
import { addDays, defaultHikeDate, formatDayName, isPlannableDate, planWindow } from "@/lib/dates";
import { saveSettings, useHasSavedSettings, useSettings } from "@/lib/preferences";
import { DRIVE_OPTIONS, searchQuery, type Search } from "@/lib/search";
import { cn } from "@/lib/utils";

/** The landing photo: Great Langdale from above Windermere. */
const COVER_PHOTO = "langdale-pikes";

export function Landing({
  viewer,
  signOutAction,
  mountainCount,
  search,
}: {
  viewer: Viewer;
  signOutAction: (() => Promise<void>) | null;
  mountainCount: number;
  /** The search being edited, when you come back from the results page. */
  search: Search | null;
}) {
  const settings = useSettings();
  const hasSaved = useHasSavedSettings();
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Fill the form from the URL when editing a search, or else from the last search on this browser.
  const initial: Search = search ?? {
    from: hasSaved ? settings.from : "",
    date: defaultHikeDate(),
    maxDriveMinutes: hasSaved ? settings.maxDriveMinutes : 180,
  };

  return (
    <div className="relative isolate min-h-svh w-full overflow-hidden bg-pine">
      <HillPhoto id={COVER_PHOTO} alt="" eager className="absolute inset-0 -z-10 size-full" />
      <div className="absolute inset-0 -z-10 bg-pine/55" aria-hidden="true" />
      <AppHeader variant="overlay" viewer={viewer} signOutAction={signOutAction} onSettings={() => setSettingsOpen(true)} />

      <main className="flex min-h-svh flex-col items-center justify-center px-5 pb-20 pt-28 text-center">
        <p className="text-sm font-semibold text-[#e8c46a]">Summit forecasts for {mountainCount} hills across Britain</p>
        <h1 className="mt-4 max-w-3xl font-display text-5xl font-extrabold leading-[0.98] text-white text-balance md:text-7xl">
          Where should you hike this weekend?
        </h1>
        <p className="mt-5 max-w-xl text-lg leading-relaxed text-white/90 text-pretty">
          Tell us where you&apos;re setting off from. We&apos;ll weigh up the weather on every summit, the drive and the
          walk itself, and pick the best one.
        </p>
        {/* Keyed so the form refills once the browser's saved search has been read. */}
        <SearchForm key={`${hasSaved}`} initial={initial} />
      </main>

      <PhotoCredit id={COVER_PHOTO} className="absolute bottom-3 right-4 text-white/60" />
      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        settings={settings}
        onSave={(next) => {
          saveSettings(next);
          setSettingsOpen(false);
        }}
      />
    </div>
  );
}

function SearchForm({ initial }: { initial: Search }) {
  const router = useRouter();
  const settings = useSettings();
  const [from, setFrom] = useState(initial.from);
  const [maxDrive, setMaxDrive] = useState(initial.maxDriveMinutes);
  const [date, setDate] = useState(initial.date);
  const [error, setError] = useState("");

  const saturday = defaultHikeDate();
  const weekend = [saturday, addDays(saturday, 1)].filter((d) => isPlannableDate(d));
  const [customDay, setCustomDay] = useState(!weekend.includes(initial.date));
  const range = planWindow();

  return (
    <form
      noValidate
      className="mt-10 w-full max-w-2xl"
      onSubmit={(e) => {
        e.preventDefault();
        const next = from.trim();
        if (!next) {
          setError("Enter a town, city or postcode to start from.");
          return;
        }
        // Remember it, so the next visit starts from the same place.
        saveSettings({ ...settings, from: next, maxDriveMinutes: maxDrive });
        router.push(`/results?${searchQuery({ from: next, date, maxDriveMinutes: maxDrive })}`);
      }}
    >
      <div
        className={cn(
          "flex items-center gap-2 rounded-2xl bg-surface p-2 pl-5 shadow-[0_12px_40px_rgba(20,24,14,0.35)] ring-2 transition-colors",
          error ? "ring-clay" : "ring-transparent focus-within:ring-moss",
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
          <span className="hidden sm:inline">Find my summit</span>
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

      <div className="mt-7 space-y-3">
        <ChipGroup label="Drive up to" icon={<Car className="size-4" />}>
          {DRIVE_OPTIONS.map((o) => (
            <Chip key={o.label} selected={maxDrive === o.minutes} onClick={() => setMaxDrive(o.minutes)}>
              {o.label}
            </Chip>
          ))}
        </ChipGroup>
        <ChipGroup label="Hiking on" icon={<CalendarDays className="size-4" />}>
          {weekend.map((d) => (
            <Chip
              key={d}
              selected={!customDay && date === d}
              onClick={() => {
                setCustomDay(false);
                setDate(d);
              }}
            >
              {formatDayName(d, "short")}
            </Chip>
          ))}
          <Chip selected={customDay} onClick={() => setCustomDay(true)}>
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
                className="h-9 rounded-full bg-surface px-4 text-sm font-semibold text-pine outline-none focus-visible:ring-2 focus-visible:ring-white"
              />
            </>
          )}
        </ChipGroup>
      </div>
    </form>
  );
}

function ChipGroup({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2">
      <span className="flex items-center gap-1.5 whitespace-nowrap text-sm font-medium text-white/90">
        {icon}
        {label}
      </span>
      <div role="group" aria-label={label} className="flex flex-wrap justify-center gap-2">
        {children}
      </div>
    </div>
  );
}

function Chip({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "h-9 whitespace-nowrap rounded-full px-4 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white",
        selected ? "bg-surface text-pine" : "bg-black/25 text-white ring-1 ring-inset ring-white/35 hover:bg-black/40",
      )}
    >
      {children}
    </button>
  );
}
