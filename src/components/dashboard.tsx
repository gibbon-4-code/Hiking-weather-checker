"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Info, LogOut, MapPin, Mountain, RefreshCw, Settings2, TriangleAlert } from "lucide-react";
import { DetailSheet } from "@/components/detail-sheet";
import { MountainCard } from "@/components/mountain-card";
import { PlannerBar } from "@/components/planner-bar";
import { RecommendationHero } from "@/components/recommendation-hero";
import { SettingsDialog } from "@/components/settings-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import type { Viewer } from "@/auth";
import { defaultHikeDate, formatDayName, formatDuration, isPlannableDate } from "@/lib/dates";
import { saveSettings, useSettings } from "@/lib/preferences";
import { recommend, scoreDestination, type DestinationScore } from "@/lib/scoring";
import type { PlanResponse } from "@/lib/types";

type SortKey = "overall" | "weather" | "nearest";
/** Cards shown at first, and how many more each "Show more" adds. */
const PAGE_SIZE = 12;
const SORT_OPTIONS = [
  { value: "overall", label: "Best overall" },
  { value: "weather", label: "Best weather" },
  { value: "nearest", label: "Nearest first" },
];

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: PlanResponse };

export function Dashboard({
  viewer,
  signOutAction,
  localPreview,
}: {
  viewer: Viewer;
  signOutAction: (() => Promise<void>) | null;
  localPreview: boolean;
}) {
  const settings = useSettings();
  const router = useRouter();
  const [state, setState] = useState<State>({ status: "loading" });
  const [reloadKey, setReloadKey] = useState(0);
  const [date, setDate] = useState(() => defaultHikeDate());
  const [sort, setSort] = useState<SortKey>("overall");
  const [shown, setShown] = useState(PAGE_SIZE);
  const [openId, setOpenId] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ from: settings.from, date });
    fetch(`/api/plan?${params}`, { signal: controller.signal })
      .then(async (res) => {
        const body = await res.json();
        if (res.status === 401) {
          router.replace("/signin");
          return;
        }
        if (!res.ok) throw new Error(body.error ?? `Request failed (${res.status})`);
        setState({ status: "ready", data: body as PlanResponse });
      })
      .catch((err: Error) => {
        if (err.name !== "AbortError") setState({ status: "error", message: err.message });
      });
    return () => controller.abort();
  }, [settings.from, date, reloadKey, router]);

  const changeDate = useCallback((next: string) => {
    if (!isPlannableDate(next)) return;
    setState({ status: "loading" });
    setDate(next);
  }, []);

  const changeFrom = useCallback(
    (from: string) => {
      setState({ status: "loading" });
      saveSettings({ ...settings, from });
    },
    [settings],
  );

  const reload = useCallback(() => {
    setState({ status: "loading" });
    setReloadKey((k) => k + 1);
  }, []);

  const scores = useMemo(() => {
    if (state.status !== "ready") return [];
    return state.data.destinations.map((d) => scoreDestination(d, settings));
  }, [state, settings]);

  const recommendation = useMemo(() => recommend(scores), [scores]);

  const data = state.status === "ready" ? state.data : null;

  const sorted = useMemo(() => {
    const valueFor = (s: DestinationScore) => {
      if (sort === "nearest") return -s.destination.drive.minutes;
      const key = sort === "weather" ? "weather" : "total";
      return Math.max(-1, ...s.days.map((d) => (d.vetoes.length ? d[key] - 100 : d[key])));
    };
    return [...scores].sort((a, b) => valueFor(b) - valueFor(a));
  }, [scores, sort]);

  const withinReach = sorted.filter((s) => !s.beyondMaxDrive);
  const outOfReach = sorted.length - withinReach.length;

  const visibleDates = [date];
  const openScore = scores.find((s) => s.destination.mountain.id === openId) ?? null;
  const pickId = recommendation.pick?.score.destination.mountain.id;
  const allDemo = data?.destinations.every((d) => d.forecast.source === "demo");

  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Mountain className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="font-heading text-base font-semibold leading-tight">Summit Planner</h1>
            <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
              <MapPin className="size-3" />
              {data ? `From ${data.home.label}` : "Loading"}
              {` · ${formatDayName(date, "short")}`}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={reload} aria-label="Refresh forecast">
            <RefreshCw className={state.status === "loading" ? "animate-spin" : ""} />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setSettingsOpen(true)}>
            <Settings2 /> <span className="hidden sm:inline">Settings</span>
          </Button>
          <div className="hidden items-center gap-2 border-l pl-3 text-sm sm:flex">
            {viewer.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={viewer.image} alt="" className="size-7 rounded-full" />
            )}
            <span className="max-w-32 truncate text-muted-foreground">{viewer.name}</span>
          </div>
          {signOutAction && (
            <form action={signOutAction}>
              <Button type="submit" variant="ghost" size="icon" aria-label="Sign out">
                <LogOut />
              </Button>
            </form>
          )}
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-4 py-6">
        {localPreview && (
          <Alert>
            <Info />
            <AlertTitle>Local preview: sign-in is off</AlertTitle>
            <AlertDescription>
              Add the GitHub sign-in keys from <code>.env.example</code> to lock this down before going live.
            </AlertDescription>
          </Alert>
        )}

        <PlannerBar
          from={settings.from}
          onFromChange={changeFrom}
          maxDriveMinutes={settings.maxDriveMinutes}
          onMaxDriveChange={(maxDriveMinutes) => saveSettings({ ...settings, maxDriveMinutes })}
          date={date}
          onDateChange={changeDate}
        />

        {state.status === "loading" && <LoadingState />}

        {state.status === "error" && (
          <Alert variant="destructive">
            <TriangleAlert />
            <AlertTitle>Couldn&apos;t load the forecast</AlertTitle>
            <AlertDescription>
              <p>{state.message}</p>
              <div className="mt-3">
                <Button size="sm" variant="outline" onClick={reload}>
                  Try again
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {data && (
          <>
            <RecommendationHero
              recommendation={recommendation}
              date={date}
              onOpen={setOpenId}
              maxDriveMinutes={settings.maxDriveMinutes}
            />

            {(data.notices.length > 0 || allDemo) && (
              <div className="space-y-2">
                {data.notices.map((n) => (
                  <p key={n} className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
                    <Info className="mt-0.5 size-4 shrink-0" /> {n}
                  </p>
                ))}
              </div>
            )}

            <section className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="font-heading text-lg font-semibold">
                  {outOfReach ? "Within reach" : "All destinations"}
                </h2>
                <div className="flex items-center gap-2">
                  <Select items={SORT_OPTIONS} value={sort} onValueChange={(v) => v && setSort(v as SortKey)}>
                    <SelectTrigger className="w-36" aria-label="Sort destinations">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SORT_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {withinReach.slice(0, shown).map((s) => (
                  <MountainCard
                    key={s.destination.mountain.id}
                    score={s}
                    visibleDates={visibleDates}
                    isPick={s.destination.mountain.id === pickId}
                    onOpen={() => setOpenId(s.destination.mountain.id)}
                  />
                ))}
              </div>
              {withinReach.length > shown && (
                <div className="flex justify-center">
                  <Button variant="outline" onClick={() => setShown((n) => n + PAGE_SIZE)}>
                    Show {Math.min(PAGE_SIZE, withinReach.length - shown)} more of {withinReach.length - shown}
                  </Button>
                </div>
              )}
              {outOfReach > 0 && settings.maxDriveMinutes !== null && (
                <p className="text-sm text-muted-foreground">
                  {withinReach.length === 0
                    ? `Nothing is within ${formatDuration(settings.maxDriveMinutes)} of ${data.home.label}. Drag the Max drive slider to see some options.`
                    : `${outOfReach} more ${outOfReach === 1 ? "destination is" : "destinations are"} over ${formatDuration(settings.maxDriveMinutes)} away. Drag the Max drive slider to include ${outOfReach === 1 ? "it" : "them"}.`}
                </p>
              )}
            </section>

            <Footer data={data} />
          </>
        )}
      </main>

      {data && (
        <DetailSheet
          score={openScore}
          home={data.home}
          secondOpinion={data.secondOpinion}
          onClose={() => setOpenId(null)}
        />
      )}
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

function LoadingState() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading forecasts">
      <Skeleton className="h-64 w-full rounded-2xl" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-56 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

function Footer({ data }: { data: PlanResponse }) {
  const sources = new Set(data.destinations.map((d) => d.forecast.source));
  const parts = [
    sources.has("openmeteo") && "Open-Meteo",
    sources.has("demo") && "demo data",
  ].filter(Boolean);
  return (
    <footer className="border-t pt-4 text-xs text-muted-foreground">
      <p>
        Forecasts: {parts.join(", ")}. Drive times:{" "}
        {data.keys.routing ? "OpenRouteService" : "estimated (add an OpenRouteService key for real road times)"}. Updated{" "}
        {new Date(data.generatedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" })}.
      </p>
      {!data.keys.metOffice && (
        <p className="mt-1">Add a Met Office API key to see its forecast as a second opinion in each mountain&apos;s details.</p>
      )}
      <p className="mt-1">
        Always check the mountain forecast and conditions on the day. Scores are a planning aid, not a safety guarantee.
      </p>
    </footer>
  );
}
