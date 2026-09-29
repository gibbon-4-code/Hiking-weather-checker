import { BedDouble, Car, Check, Compass, TriangleAlert } from "lucide-react";
import { DayStats } from "@/components/day-stats";
import { ScoreBadge } from "@/components/score-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { WeatherIcon } from "@/components/weather-icon";
import { formatDayName, formatDuration } from "@/lib/dates";
import { CONDITION_LABEL } from "@/lib/providers/conditions";
import type { Recommendation } from "@/lib/scoring";

export function RecommendationHero({
  recommendation,
  onOpen,
  maxDriveMinutes,
}: {
  recommendation: Recommendation;
  onOpen: (id: string) => void;
  maxDriveMinutes: number | null;
}) {
  const { pick, runnerUp } = recommendation;

  if (!pick) {
    return (
      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-950">
        <div className="flex items-start gap-3">
          <TriangleAlert className="mt-0.5 size-5 shrink-0" />
          <div>
            <h2 className="font-heading text-lg font-semibold">No safe pick this weekend</h2>
            <p className="mt-1 text-sm">
              Every destination{maxDriveMinutes ? ` within ${formatDuration(maxDriveMinutes)}` : ""} has a safety warning on
              both days. Check the cards below for the least-bad option, or widen your drive limit in Settings.
            </p>
          </div>
        </div>
      </section>
    );
  }

  const { mountain, drive } = pick.score.destination;
  const { summary } = pick.day;

  return (
    <section className="overflow-hidden rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
      <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <p className="flex items-center gap-2 text-sm font-medium uppercase tracking-wider text-primary-foreground/70">
            <Compass className="size-4" /> This weekend, go to
          </p>
          <div className="mt-3 flex items-start gap-4">
            <ScoreBadge score={pick.day.total} size="lg" className="shrink-0 ring-4 ring-white/20" />
            <div className="min-w-0">
              <h2 className="font-heading text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
                {mountain.name}
              </h2>
              <p className="mt-1 text-primary-foreground/80">
                {mountain.area} · <span className="font-medium text-primary-foreground">{formatDayName(pick.day.date)}</span>
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Badge className="bg-white/15 text-primary-foreground">
              <WeatherIcon condition={summary.condition} className="text-primary-foreground!" />
              {CONDITION_LABEL[summary.condition]}
            </Badge>
            <Badge className="bg-white/15 text-primary-foreground">
              <Car /> {formatDuration(drive.minutes)} drive
            </Badge>
            {pick.score.needsOvernight && (
              <Badge className="bg-white/15 text-primary-foreground">
                <BedDouble /> Stay in {mountain.stayNear}
              </Badge>
            )}
            <Badge className="bg-white/15 text-primary-foreground">{mountain.difficulty}</Badge>
            <Badge className="bg-white/15 text-primary-foreground">{pick.day.confidence} confidence</Badge>
          </div>

          <ul className="mt-5 space-y-2">
            {pick.reasons.map((r) => (
              <li key={r} className="flex gap-2 text-sm sm:text-base">
                <Check className="mt-0.5 size-4 shrink-0 text-emerald-300" />
                {r}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col gap-4 rounded-xl bg-white/10 p-4">
          <DayStats summary={summary} className="[&_dd]:text-foreground" />
          <p className="text-sm text-primary-foreground/85">
            <span className="font-medium text-primary-foreground">{mountain.route}.</span> {mountain.walkingHours}.
          </p>
          <Button variant="secondary" className="mt-auto w-full" onClick={() => onOpen(mountain.id)}>
            See the hour-by-hour forecast
          </Button>
        </div>
      </div>

      {runnerUp && (
        <button
          type="button"
          onClick={() => onOpen(runnerUp.score.destination.mountain.id)}
          className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 border-t border-white/15 bg-black/10 px-5 py-3 text-left text-sm transition-colors hover:bg-black/20 sm:px-7"
        >
          <span className="text-primary-foreground/70">{runnerUp.why}:</span>
          <span className="font-medium">
            {runnerUp.score.destination.mountain.name} on {formatDayName(runnerUp.day.date, "short")}
          </span>
          <span className="text-primary-foreground/70">
            score {runnerUp.day.total} · {formatDuration(runnerUp.score.destination.drive.minutes)} drive
          </span>
        </button>
      )}
    </section>
  );
}
