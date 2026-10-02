"use client";

import { useEffect, useState } from "react";
import { BedDouble, ExternalLink, MapPin, Navigation, ShieldAlert, Sunrise, Sunset } from "lucide-react";
import { DayStats } from "@/components/day-stats";
import { HourlyChart } from "@/components/hourly-chart";
import { ScoreBadge } from "@/components/score-badge";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { WeatherIcon } from "@/components/weather-icon";
import { addDays, formatClock, formatDayName, formatDuration, planWindow } from "@/lib/dates";
import { CONDITION_LABEL } from "@/lib/providers/conditions";
import { summariseDay, type DestinationScore } from "@/lib/scoring";
import type { DayForecast, DestinationForecast, ForecastSource, Home } from "@/lib/types";

const SOURCE_LABEL: Record<ForecastSource, string> = {
  metoffice: "Met Office",
  openmeteo: "Open-Meteo",
  demo: "Demo data",
};

export function DetailSheet({
  score,
  home,
  secondOpinion,
  onClose,
}: {
  score: DestinationScore | null;
  home: Home;
  /** Whether to ask the Met Office for its view of this mountain. */
  secondOpinion: boolean;
  onClose: () => void;
}) {
  return (
    <Sheet open={score !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto data-[side=right]:sm:max-w-xl">
        {score && <DetailBody score={score} home={home} secondOpinion={secondOpinion} />}
      </SheetContent>
    </Sheet>
  );
}

function DetailBody({ score, home, secondOpinion }: { score: DestinationScore; home: Home; secondOpinion: boolean }) {
  const { mountain, drive, forecast } = score.destination;
  const metOffice = useMetOffice(mountain.id, forecast.days[0]?.date, secondOpinion);
  // A long drive means arriving the evening before, so book the night before the hike.
  const hikeDate = forecast.days[0]?.date;
  const checkin = hikeDate && hikeDate > planWindow().first ? addDays(hikeDate, -1) : undefined;
  const checkout = hikeDate;
  const isMountain = mountain.summit.elevationM > 500;

  return (
    <>
      <SheetHeader className="pr-12">
        <SheetTitle className="font-heading text-xl">{mountain.name}</SheetTitle>
        <SheetDescription>
          {mountain.area} · {mountain.summit.elevationM} m · {mountain.difficulty}
        </SheetDescription>
      </SheetHeader>

      <div className="space-y-6 px-4 pb-8">
        <section className="rounded-xl bg-muted/50 p-4 text-sm">
          <p className="font-medium">{mountain.route}</p>
          <p className="mt-1 text-muted-foreground">
            {mountain.walkingHours} · starts at {mountain.trailhead.name}
          </p>
          <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-muted-foreground">
            <span className="flex items-center gap-1">
              <Navigation className="size-3.5" />
              {formatDuration(drive.minutes)} · {drive.km} km from {home.label}
              {drive.method === "estimate" ? " (estimate)" : ""}
            </span>
            {score.needsOvernight && (
              <span className="flex items-center gap-1">
                <BedDouble className="size-3.5" /> Stay near {mountain.stayNear}
              </span>
            )}
          </p>
        </section>

        {score.days.map((dayScore) => {
          const day = forecast.days.find((d) => d.date === dayScore.date);
          if (!day) return null;
          const other = metOffice.forecast?.days.find((d) => d.date === day.date);
          return (
            <section key={day.date} className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-heading text-lg font-semibold">{formatDayName(day.date)}</h3>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{dayScore.confidence} confidence</Badge>
                  <ScoreBadge score={dayScore.total} />
                </div>
              </div>

              {dayScore.vetoes.length > 0 && (
                <div className="flex gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
                  <ShieldAlert className="mt-0.5 size-4 shrink-0" />
                  <div>
                    <p className="font-medium">Not recommended</p>
                    <p>{dayScore.vetoes.join(" · ")}</p>
                  </div>
                </div>
              )}

              <DayStats summary={dayScore.summary} />
              <ScoreBreakdown weather={dayScore.weather} travel={dayScore.travel} quality={dayScore.quality} />
              <HourlyChart slots={day.slots} />
              <SlotTable day={day} />
              <SunTimes day={day} />
              {other && <SecondOpinion day={other} />}
              {metOffice.status === "loading" && (
                <p className="text-xs text-muted-foreground">Asking the Met Office for a second opinion…</p>
              )}
              {metOffice.status === "failed" && (
                <p className="text-xs text-muted-foreground">The Met Office didn&apos;t respond, so there&apos;s no second opinion.</p>
              )}
              <Separator />
            </section>
          );
        })}

        <section className="space-y-2 text-sm">
          <h3 className="font-heading font-semibold">Plan the trip</h3>
          <div className="grid gap-2 sm:grid-cols-2">
            <ExternalButton
              href={`https://www.google.com/maps/dir/?api=1&origin=${home.lat},${home.lon}&destination=${mountain.trailhead.lat},${mountain.trailhead.lon}&travelmode=driving`}
              icon={<MapPin className="size-4" />}
            >
              Directions to {mountain.trailhead.name}
            </ExternalButton>
            {checkin && checkout && score.needsOvernight && (
              <ExternalButton
                href={`https://www.booking.com/searchresults.html?ss=${encodeURIComponent(mountain.stayNear)}&checkin=${checkin}&checkout=${checkout}&group_adults=2`}
                icon={<BedDouble className="size-4" />}
              >
                Hotels in {mountain.stayNear}
              </ExternalButton>
            )}
            {isMountain && (
              <>
                <ExternalButton href="https://www.metoffice.gov.uk/weather/specialist-forecasts/mountain" icon={<ExternalLink className="size-4" />}>
                  Met Office mountain forecast
                </ExternalButton>
                <ExternalButton href="https://www.mwis.org.uk/forecasts" icon={<ExternalLink className="size-4" />}>
                  MWIS mountain forecast
                </ExternalButton>
              </>
            )}
          </div>
        </section>

        <p className="text-xs text-muted-foreground">
          Forecast from {SOURCE_LABEL[forecast.source]}
          {forecast.issuedAt ? `, model run ${new Date(forecast.issuedAt).toLocaleString("en-GB", { timeZone: "Europe/London" })}` : ""}.
          {forecast.source === "openmeteo" && <> Forecast is calculated for the {mountain.summit.elevationM} m summit.</>}
        </p>
      </div>
    </>
  );
}

function ScoreBreakdown({ weather, travel, quality }: { weather: number; travel: number; quality: number }) {
  const rows = [
    { label: "Weather", value: weather },
    { label: "Travel", value: travel },
    { label: "Hike quality", value: quality },
  ];
  return (
    <div className="grid grid-cols-3 gap-3 text-xs">
      {rows.map((r) => (
        <div key={r.label}>
          <div className="flex justify-between text-muted-foreground">
            <span>{r.label}</span>
            <span className="tabular-nums">{r.value}</span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary" style={{ width: `${r.value}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function SlotTable({ day }: { day: DayForecast }) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-xs tabular-nums">
        <thead className="bg-muted/50 text-muted-foreground">
          <tr>
            <th className="px-2 py-1.5 text-left font-medium">Time</th>
            <th className="px-2 py-1.5 text-left font-medium">Weather</th>
            <th className="px-2 py-1.5 text-right font-medium">Temp</th>
            <th className="px-2 py-1.5 text-right font-medium">Feels</th>
            <th className="px-2 py-1.5 text-right font-medium">Gusts</th>
            <th className="px-2 py-1.5 text-right font-medium">Rain</th>
          </tr>
        </thead>
        <tbody>
          {day.slots
            .filter((_, i) => day.slots[0]?.hours === 3 || i % 2 === 0)
            .map((s) => (
              <tr key={s.time} className="border-t">
                <td className="px-2 py-1.5">{formatClock(s.time)}</td>
                <td className="px-2 py-1.5">
                  <span className="flex items-center gap-1.5">
                    <WeatherIcon condition={s.condition} className="size-3.5" />
                    <span className="truncate">{CONDITION_LABEL[s.condition]}</span>
                  </span>
                </td>
                <td className="px-2 py-1.5 text-right">{Math.round(s.tempC)}°</td>
                <td className="px-2 py-1.5 text-right">{Math.round(s.feelsLikeC)}°</td>
                <td className={`px-2 py-1.5 text-right ${s.gustMph >= 45 ? "font-semibold text-rose-700" : ""}`}>{s.gustMph}</td>
                <td className="px-2 py-1.5 text-right text-sky-700">{s.precipProb}%</td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}

function SunTimes({ day }: { day: DayForecast }) {
  if (!day.sunrise || !day.sunset) return null;
  const minutes = (Date.parse(day.sunset) - Date.parse(day.sunrise)) / 60000;
  return (
    <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
      <span className="flex items-center gap-1">
        <Sunrise className="size-3.5 text-amber-500" /> {formatClock(day.sunrise)}
      </span>
      <span className="flex items-center gap-1">
        <Sunset className="size-3.5 text-orange-500" /> {formatClock(day.sunset)}
      </span>
      <span>{formatDuration(minutes)} of daylight</span>
    </p>
  );
}

type MetOfficeState =
  | { status: "off" | "loading" | "failed"; forecast: null }
  | { status: "ready"; forecast: DestinationForecast | null };

/** Fetches the Met Office forecast for one mountain when its details open: one call, not one per mountain. */
function useMetOffice(id: string, date: string | undefined, enabled: boolean): MetOfficeState {
  const key = `${id}:${date}`;
  const [result, setResult] = useState<{ key: string; state: MetOfficeState } | null>(null);

  useEffect(() => {
    if (!enabled || !date) return;
    const controller = new AbortController();
    fetch(`/api/second-opinion?${new URLSearchParams({ id, date })}`, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error(`Second opinion failed (${res.status})`);
        const body = (await res.json()) as { forecast: DestinationForecast | null };
        setResult({ key, state: { status: "ready", forecast: body.forecast } });
      })
      .catch((err: Error) => {
        if (err.name !== "AbortError") setResult({ key, state: { status: "failed", forecast: null } });
      });
    return () => controller.abort();
  }, [id, date, enabled, key]);

  if (!enabled || !date) return { status: "off", forecast: null };
  return result?.key === key ? result.state : { status: "loading", forecast: null };
}

function SecondOpinion({ day }: { day: DayForecast }) {
  const s = summariseDay(day);
  if (!s) return null;
  return (
    <p className="rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
      <span className="font-medium text-foreground">Second opinion (Met Office, adjusted to summit height):</span>{" "}
      {CONDITION_LABEL[s.condition].toLowerCase()}, {s.maxPrecipProb}% rain, gusts {s.maxGustMph} mph,{" "}
      {Math.round(s.minTempC)}–{Math.round(s.maxTempC)}°C.
    </p>
  );
}

function ExternalButton({ href, icon, children }: { href: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-2 rounded-lg border px-3 py-2 font-medium transition-colors hover:bg-muted"
    >
      {icon}
      <span className="truncate">{children}</span>
    </a>
  );
}
