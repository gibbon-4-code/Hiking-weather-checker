import { BedDouble, Info, Navigation } from "lucide-react";
import { DifficultyTag } from "@/components/difficulty-tag";
import { HillPhoto, PhotoCredit } from "@/components/hill-photo";
import { TripFacts } from "@/components/trip-facts";
import { WeatherRating } from "@/components/weather-rating";
import { formatDayName, formatDuration } from "@/lib/dates";
import { directionsUrl } from "@/lib/links";
import type { Pick as ScoredPick, Recommendation } from "@/lib/scoring";
import type { Home } from "@/lib/types";
import { cn } from "@/lib/utils";
import { walkParts } from "@/lib/walks";

export const primaryButton =
  "inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-clay px-5 text-sm font-semibold text-surface transition-colors hover:bg-clay-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay";
export const secondaryButton =
  "inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-5 text-sm font-semibold text-pine ring-1 ring-inset ring-dune transition-colors hover:bg-sand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss";
const secondaryDarkButton =
  "inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-5 text-sm font-semibold text-surface ring-1 ring-inset ring-white/30 transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";

/** Both content rows share one column template, so the right-hand column starts at the same x in each. */
const row = "grid gap-x-12 gap-y-6 px-6 py-6 md:px-8 xl:grid-cols-[3fr_2fr]";

/** The one recommendation: the drive and walk up front, the weather boiled down to one score. */
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
  const { mountain } = pick.score.destination;
  const directions = (
    <a href={directionsUrl(home, mountain)} target="_blank" rel="noreferrer" className={primaryButton}>
      <Navigation className="size-4" aria-hidden="true" />
      Get directions
    </a>
  );

  return (
    <section aria-labelledby="best-bet" className="overflow-hidden rounded-2xl bg-surface ring-1 ring-dune/70">
      <div className="relative aspect-[4/3] sm:aspect-[21/9] lg:aspect-[3/1]">
        <HillPhoto id={mountain.id} alt={`${mountain.name}, ${mountain.area}`} eager className="absolute inset-0 size-full" />
        <div className="absolute inset-0 bg-gradient-to-t from-bark/60 via-bark/25 to-bark/10" aria-hidden="true" />
        <PhotoCredit id={mountain.id} className="absolute right-3 top-2 hidden text-white/60 sm:block" />
        <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-6 px-6 pb-6 text-white md:px-8 md:pb-8">
          <div>
            <p className="text-sm font-semibold text-[#e8c46a]">Your best bet for {formatDayName(pick.day.date)}</p>
            <h1
              id="best-bet"
              className="mt-2 font-display text-5xl font-extrabold leading-none [text-shadow:0_2px_16px_rgba(20,24,14,0.35)] md:text-6xl"
            >
              {mountain.name}
            </h1>
            <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-white/90">
              <span>{mountain.area}</span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">{mountain.summit.elevationM} m</span>
              <span aria-hidden="true">·</span>
              <DifficultyTag difficulty={mountain.difficulty} tone="dark" />
            </p>
          </div>
          <div className="hidden gap-3 md:flex">
            <button type="button" onClick={() => onOpen(mountain.id)} className={secondaryDarkButton}>
              Full details
            </button>
            {directions}
          </div>
        </div>
      </div>

      <div className={cn(row, "xl:items-center")}>
        <TripFacts score={pick.score} size="lg" />
        <WeatherRating day={pick.day} size="lg" />
      </div>

      <div className={cn(row, "border-t border-dune/60")}>
        <div>
          <h2 className="text-sm font-semibold text-bark">Why it&apos;s the pick</h2>
          <ul className="mt-3 space-y-2" aria-label="Why we picked it">
            {pick.reasons.map((r) => (
              <li key={r} className="flex gap-2.5 text-[15px] text-bark">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-moss" aria-hidden="true" />
                {r}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="text-sm font-semibold text-bark">The route</h2>
          <p className="mt-3 text-[15px] leading-relaxed text-bark">
            {mountain.route}, starting from {mountain.trailhead.name}.
          </p>
          {pick.score.needsOvernight && (
            <p className="mt-3 flex items-center gap-1.5 text-sm text-muted-foreground">
              <BedDouble className="size-4" /> A long drive: worth a night in {mountain.stayNear}.
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-3 px-6 pb-6 md:hidden">
        {directions}
        <button type="button" onClick={() => onOpen(mountain.id)} className={secondaryButton}>
          Full details
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t border-dune/60 bg-sand/40 px-6 py-4 md:px-8">
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
                · {formatDuration(runnerUp.score.destination.drive.minutes)} drive ·{" "}
                {walkParts(runnerUp.score.destination.mountain).time} walk
              </span>
            </span>
          </button>
        ) : (
          <span />
        )}
        {pick.day.confidence !== "High" && (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Info className="size-3.5 shrink-0" aria-hidden="true" />
            {pick.day.confidence} confidence this far out. Check again nearer the day.
          </p>
        )}
      </div>
    </section>
  );
}
