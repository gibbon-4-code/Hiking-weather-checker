"use client";

import { useState } from "react";
import type { Viewer } from "@/auth";
import { AppHeader } from "@/components/app-header";
import { HillPhoto, PhotoCredit } from "@/components/hill-photo";
import { SearchForm } from "@/components/search-form";
import { SettingsDialog } from "@/components/settings-dialog";
import { defaultHikeDate } from "@/lib/dates";
import { saveSettings, useHasSavedSettings, useSettings } from "@/lib/preferences";
import type { Search } from "@/lib/search";

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
    walk: hasSaved ? settings.walk : null,
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
        <SearchForm key={`${hasSaved}`} initial={initial} className="mt-10" />
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
