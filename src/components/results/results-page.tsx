"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Info, RefreshCw, TriangleAlert } from "lucide-react";
import type { Viewer } from "@/auth";
import { AppHeader } from "@/components/app-header";
import { DetailSheet } from "@/components/detail-sheet";
import { BestBet, primaryButton } from "@/components/results/best-bet";
import { ResultCards, type ResultItem } from "@/components/results/result-cards";
import { SearchSummary } from "@/components/results/search-summary";
import { SortToggle, type SortKey } from "@/components/results/sort-toggle";
import { SettingsDialog } from "@/components/settings-dialog";
import { formatDayName } from "@/lib/dates";
import { saveSettings, useSettings } from "@/lib/preferences";
import { inSearch, recommend, scoreDestination } from "@/lib/scoring";
import { driveLimitLabel, searchQuery, type Search } from "@/lib/search";
import type { PlanResponse } from "@/lib/types";
import { walkHours, walkLabel } from "@/lib/walks";

/** Cards shown at first, and how many more each "Show more" adds. */
const PAGE_SIZE = 12;

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: PlanResponse };

export function ResultsPage({
  viewer,
  signOutAction,
  localPreview,
  search,
}: {
  viewer: Viewer;
  signOutAction: (() => Promise<void>) | null;
  localPreview: boolean;
  search: Search;
}) {
  const router = useRouter();
  const settings = useSettings();
  const query = searchQuery(search);
  // Tracks which search the result belongs to, so a new search shows the skeleton straight away.
  const [result, setResult] = useState<{ key: string; state: State } | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [sort, setSort] = useState<SortKey>("score");
  const [shown, setShown] = useState(PAGE_SIZE);
  const [openId, setOpenId] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const fetchKey = `${search.from}|${search.date}|${reloadKey}`;

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ from: search.from, date: search.date });
    fetch(`/api/plan?${params}`, { signal: controller.signal })
      .then(async (res) => {
        const body = await res.json();
        if (res.status === 401) {
          router.replace("/signin");
          return;
        }
        if (!res.ok) throw new Error(body.error ?? `Request failed (${res.status})`);
        setResult({ key: fetchKey, state: { status: "ready", data: body as PlanResponse } });
      })
      .catch((err: Error) => {
        if (err.name !== "AbortError") setResult({ key: fetchKey, state: { status: "error", message: err.message } });
      });
    return () => controller.abort();
  }, [search.from, search.date, fetchKey, router]);

  const state: State = result?.key === fetchKey ? result.state : { status: "loading" };
  const data = state.status === "ready" ? state.data : null;

  const scores = useMemo(() => {
    if (!data) return [];
    const prefs = { weights: settings.weights, maxDriveMinutes: search.maxDriveMinutes, walk: search.walk };
    return data.destinations.map((d) => scoreDestination(d, prefs));
  }, [data, settings.weights, search.maxDriveMinutes, search.walk]);

  const { pick, runnerUp } = useMemo(() => recommend(scores), [scores]);
  const pickId = pick?.score.destination.mountain.id;

  const items: ResultItem[] = useMemo(() => {
    const withDay = scores
      .filter((s) => inSearch(s) && s.destination.mountain.id !== pickId)
      .map((score) => ({ score, day: score.days.find((d) => d.date === search.date) ?? null }));
    const rank = ({ score, day }: ResultItem) => {
      if (sort === "drive") return -score.destination.drive.minutes;
      if (sort === "walk") return -walkHours(score.destination.mountain);
      // Unsafe days sink below every safe one, however good the rest of the score is.
      return day ? (day.vetoes.length ? day.total - 100 : day.total) : -200;
    };
    return withDay.sort((a, b) => rank(b) - rank(a));
  }, [scores, pickId, sort, search.date]);

  // Hills hidden by only one of the filters, so each "widen" link says what it would bring back.
  const outOfReach = scores.filter((s) => s.beyondMaxDrive && !s.wrongWalkLength).length;
  const otherWalks = scores.filter((s) => s.wrongWalkLength && !s.beyondMaxDrive).length;
  const openScore = scores.find((s) => s.destination.mountain.id === openId) ?? null;
  const widenHref = search.maxDriveMinutes !== null ? `/results?${searchQuery({ ...search, maxDriveMinutes: null })}` : null;
  const anyWalkHref = search.walk !== null ? `/results?${searchQuery({ ...search, walk: null })}` : null;
  const filterLabel = [
    search.walk !== null && `with ${walkLabel(search.walk).replace("Walk", "walks")}`,
    search.maxDriveMinutes !== null && `within a ${driveLimitLabel(search.maxDriveMinutes).replace("Up to ", "").replace(/s$/, "")} drive`,
  ]
    .filter(Boolean)
    .join(", ");
  const close = useCallback(() => setOpenId(null), []);

  return (
    <div className="min-h-svh w-full bg-sand">
      <AppHeader viewer={viewer} signOutAction={signOutAction} onSettings={() => setSettingsOpen(true)}>
        <SearchSummary
          from={data?.home.label ?? search.from}
          dateLabel={formatDayName(search.date, "short")}
          walkLabel={walkLabel(search.walk)}
          driveLabel={driveLimitLabel(search.maxDriveMinutes).replace("Up to", "Drive up to")}
          editHref={`/?${query}`}
        />
      </AppHeader>

      <main className="mx-auto max-w-6xl space-y-6 px-5 pb-24 pt-8 md:px-8">
        {localPreview && (
          <p className="flex items-start gap-2 rounded-xl bg-surface px-4 py-3 text-sm text-muted-foreground ring-1 ring-dune/70">
            <Info className="mt-0.5 size-4 shrink-0" />
            <span>
              <span className="font-semibold text-bark">Local preview: sign-in is off.</span> Add the GitHub sign-in keys
              from <code>.env.example</code> to lock this down before going live.
            </span>
          </p>
        )}

        {state.status === "loading" && <ResultsSkeleton />}

        {state.status === "error" && (
          <div className="rounded-2xl bg-clay/10 p-6 text-bark ring-1 ring-clay/30">
            <p className="flex items-center gap-2 font-semibold">
              <TriangleAlert className="size-5 text-clay" /> Couldn&apos;t load the forecast
            </p>
            <p className="mt-1 text-sm">{state.message}</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <button type="button" className={primaryButton} onClick={() => setReloadKey((k) => k + 1)}>
                Try again
              </button>
              <Link href={`/?${query}`} className="inline-flex h-11 items-center px-2 text-sm font-semibold text-moss underline underline-offset-4">
                Change the search
              </Link>
            </div>
          </div>
        )}

        {data && (
          <>
            {data.notices.map((n) => (
              <p key={n} className="flex items-start gap-2 rounded-xl bg-ochre/10 px-4 py-3 text-sm text-bark">
                <Info className="mt-0.5 size-4 shrink-0 text-ochre" /> {n}
              </p>
            ))}

            {pick ? (
              <BestBet pick={pick} runnerUp={runnerUp} home={data.home} onOpen={setOpenId} />
            ) : items.length > 0 ? (
              <section className="rounded-2xl bg-clay/10 p-6 text-bark ring-1 ring-clay/30">
                <h1 className="flex items-center gap-2 font-display text-3xl font-extrabold">
                  <TriangleAlert className="size-6 text-clay" /> No safe pick for {formatDayName(search.date)}
                </h1>
                <p className="mt-2 max-w-2xl text-sm">
                  Every hill in range has a safety warning that day. Look below for the least-bad option, try another
                  day, or allow a longer drive.
                </p>
              </section>
            ) : null}

            {items.length > 0 ? (
              <section aria-labelledby="more-hills" className="pt-10">
                <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <h2 id="more-hills" className="font-display text-3xl font-extrabold text-bark md:text-4xl">
                      {pick ? "More hills worth a look" : "Every hill in range"}
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {items.length} {pick ? "other " : ""}
                      {items.length === 1 ? "hill" : "hills"}{" "}
                      {filterLabel || "ranked by conditions"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setReloadKey((k) => k + 1)}
                      aria-label="Refresh forecast"
                      className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-dune/40 hover:text-bark"
                    >
                      <RefreshCw className="size-4" />
                    </button>
                    {items.length > 1 && (
                      <SortToggle
                        value={sort}
                        onChange={(next) => {
                          setSort(next);
                          setShown(PAGE_SIZE);
                        }}
                      />
                    )}
                  </div>
                </div>
                <ResultCards items={items.slice(0, shown)} onOpen={setOpenId} />
                {items.length > shown && (
                  <div className="mt-10 flex justify-center">
                    <button type="button" onClick={() => setShown((n) => n + PAGE_SIZE)} className="inline-flex h-11 items-center rounded-xl px-5 text-sm font-semibold text-pine ring-1 ring-inset ring-dune transition-colors hover:bg-surface">
                      Show {Math.min(PAGE_SIZE, items.length - shown)} more of {items.length - shown}
                    </button>
                  </div>
                )}
                {outOfReach > 0 && widenHref && (
                  <p className="mt-8 text-sm text-muted-foreground">
                    {outOfReach} more {outOfReach === 1 ? "hill is" : "hills are"} further than your drive limit.{" "}
                    <Link href={widenHref} className="font-medium text-moss underline underline-offset-4">
                      Allow any drive
                    </Link>
                  </p>
                )}
                {otherWalks > 0 && anyWalkHref && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    {otherWalks} more {otherWalks === 1 ? "hill is" : "hills are"} in range but {otherWalks === 1 ? "is" : "are"} a different length of walk.{" "}
                    <Link href={anyWalkHref} className="font-medium text-moss underline underline-offset-4">
                      Allow any walk
                    </Link>
                  </p>
                )}
              </section>
            ) : !pick ? (
              <div className="py-24 text-center">
                <h1 className="font-display text-4xl font-extrabold text-bark">
                  {search.walk !== null ? "No walks like that within that drive" : "No hills within that drive"}
                </h1>
                <p className="mt-2 text-muted-foreground">
                  Try allowing a longer drive from {data.home.label}
                  {search.walk !== null ? " or a different length of walk" : ""}.
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-3">
                  {widenHref && (
                    <Link href={widenHref} className={primaryButton}>
                      Allow any drive
                    </Link>
                  )}
                  {anyWalkHref && (
                    <Link href={anyWalkHref} className={primaryButton}>
                      Allow any walk
                    </Link>
                  )}
                </div>
              </div>
            ) : null}

            <Footer data={data} />
          </>
        )}
      </main>

      {data && <DetailSheet score={openScore} home={data.home} secondOpinion={data.secondOpinion} onClose={close} />}
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

function ResultsSkeleton() {
  return (
    <div aria-busy="true" aria-live="polite" aria-label="Loading forecasts">
      <p className="mb-4 text-sm font-medium text-muted-foreground">Checking the weather on every summit…</p>
      <div className="h-[420px] animate-pulse rounded-2xl bg-dune/40" />
      <div className="mt-16 h-9 w-72 animate-pulse rounded-lg bg-dune/40" />
      <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i}>
            <div className="aspect-[4/3] animate-pulse rounded-xl bg-dune/40" />
            <div className="mt-3 h-4 w-2/3 animate-pulse rounded bg-dune/40" />
            <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-dune/30" />
          </div>
        ))}
      </div>
    </div>
  );
}

function Footer({ data }: { data: PlanResponse }) {
  const sources = new Set(data.destinations.map((d) => d.forecast.source));
  const parts = [sources.has("openmeteo") && "Open-Meteo", sources.has("demo") && "demo data"].filter(Boolean);
  return (
    <footer className="mt-16 space-y-1 border-t border-dune/70 pt-4 text-xs text-muted-foreground">
      <p>
        Forecasts: {parts.join(", ")}. Drive times:{" "}
        {data.keys.routing ? "OpenRouteService" : "estimated (add an OpenRouteService key for real road times)"}. Updated{" "}
        {new Date(data.generatedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" })}.
      </p>
      {!data.keys.metOffice && <p>Add a Met Office API key to see its forecast as a second opinion in each hill&apos;s details.</p>}
      <p>
        Photos from Wikimedia Commons:{" "}
        <Link href="/credits" className="underline underline-offset-2">
          see credits
        </Link>
        .
      </p>
      <p>Always check the mountain forecast and conditions on the day. Scores are a planning aid, not a safety guarantee.</p>
    </footer>
  );
}
