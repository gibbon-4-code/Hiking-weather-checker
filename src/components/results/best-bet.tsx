import { BedDouble, Info, Navigation } from "lucide-react";
import { DifficultyTag } from "@/components/difficulty-tag";
import { HillPhoto, PhotoCredit } from "@/components/hill-photo";
import { ConditionStats } from "@/components/results/condition-stats";
import { HourlyStrip } from "@/components/results/hourly-strip";
import { ScoreBadge } from "@/components/score-badge";
import { WeatherIcon } from "@/components/weather-icon";
import { formatDayName, formatDuration } from "@/lib/dates";
import { directionsUrl } from "@/lib/links";
import { CONDITION_LABEL } from "@/lib/providers/conditions";
import type { Pick as ScoredPick, Recommendation } from "@/lib/scoring";
import type { Home } from "@/lib/types";

export const primaryButton =
  "inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-clay px-5 text-sm font-semibold text-surface transition-colors hover:bg-clay-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay";
export const secondaryButton =
  "inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-5 text-sm font-semibold text-pine ring-1 ring-inset ring-dune transition-colors hover:bg-sand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss";

/** The one recommendation, given a whole photo and the reasons behind it. */
export function BestBet({
  pick,
  runnerUp,
  home,
  onOpen,
}: {
  pick: ScoredPick;
  runnerUp: Recommendation["runnerUp"];
  home: Home;
  onOpen: (id: string) => void;
}) {
  const { mountain, forecast } = pick.score.destination;
  const s = pick.day.summary;
  const slots = forecast.days.find((d) => d.date === pick.day.date)?.slots ?? [];

  return (
    <section aria-labelledby="best-bet" className="overflow-hidden rounded-2xl bg-surface ring-1 ring-dune/70">
      <div className="relative aspect-[4/3] sm:aspect-[21/9]">
        <HillPhoto id={mountain.id} alt={`${mountain.name}, ${mountain.area}`} eager className="absolute inset-0 size-full" />
        <div className="absolute inset-0 bg-gradient-to-t from-bark/75 via-bark/25 to-bark/10" aria-hidden="true" />
        <div className="absolute right-5 top-5">
          <ScoreBadge score={pick.day.total} size="lg" inverted />
        </div>
        <div className="absolute inset-x-0 bottom-0 p-6 text-white md:p-8">
          <p className="text-sm font-semibold text-[#e8c46a]">Your best bet for {formatDayName(pick.day.date)}</p>
          <h1 id="best-bet" className="mt-1 font-display text-5xl font-extrabold leading-none md:text-7xl">
            {mountain.name}
          </h1>
          <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-white/90">
            <span>{mountain.area}</span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">{mountain.summit.elevationM} m</span>
            <span aria-hidden="true">·</span>
            <span className="flex items-center gap-1.5">
              <WeatherIcon condition={s.condition} tone="dark" className="size-4" />
              {CONDITION_LABEL[s.condition]}
            </span>
          </p>
        </div>
        <PhotoCredit id={mountain.id} className="absolute bottom-2 right-3 hidden text-white/60 sm:block" />
      </div>

      <ConditionStats summary={s} score={pick.score} extended className="border-b border-dune/60 px-6 py-5 md:px-8" />

      <div className="grid gap-8 px-6 py-6 md:px-8 lg:grid-cols-[1fr_1.15fr] lg:gap-12">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <DifficultyTag difficulty={mountain.difficulty} />
            {pick.day.confidence !== "High" && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Info className="size-3.5" aria-hidden="true" />
                {pick.day.confidence} confidence this far out, so check again nearer the day
              </span>
            )}
          </div>
          <ul className="mt-5 space-y-2" aria-label="Why we picked it">
            {pick.reasons.map((r) => (
              <li key={r} className="flex gap-2.5 text-[15px] text-bark">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-moss" aria-hidden="true" />
                {r}
              </li>
            ))}
          </ul>
          <p className="mt-5 text-[15px] leading-relaxed text-muted-foreground">
            <span className="font-semibold text-bark">The route. </span>
            {mountain.route}, starting from {mountain.trailhead.name}. {mountain.walkingHours}.
          </p>
          {pick.score.needsOvernight && (
            <p className="mt-3 flex items-center gap-1.5 text-sm text-muted-foreground">
              <BedDouble className="size-4" /> A long drive: worth a night in {mountain.stayNear}.
            </p>
          )}
        </div>
        <HourlyStrip slots={slots} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-dune/60 px-6 py-4 md:px-8">
        {runnerUp ? (
          <button
            type="button"
            onClick={() => onOpen(runnerUp.score.destination.mountain.id)}
            className="group flex items-center gap-3 text-left text-sm"
          >
            <HillPhoto id={runnerUp.score.destination.mountain.id} alt="" className="size-9 shrink-0 rounded-full" />
            <span className="text-muted-foreground">
              {runnerUp.why}:{" "}
              <span className="font-semibold text-bark underline decoration-dune underline-offset-4 transition-colors group-hover:decoration-moss">
                {runnerUp.score.destination.mountain.name}
              </span>{" "}
              <span className="whitespace-nowrap tabular-nums">
                · {runnerUp.day.total} · {formatDuration(runnerUp.score.destination.drive.minutes)}
              </span>
            </span>
          </button>
        ) : (
          <span />
        )}
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={() => onOpen(mountain.id)} className={secondaryButton}>
            Full details
          </button>
          <a href={directionsUrl(home, mountain)} target="_blank" rel="noreferrer" className={primaryButton}>
            <Navigation className="size-4" aria-hidden="true" />
            Get directions
          </a>
        </div>
      </div>
    </section>
  );
}
