import { Moon, ShieldAlert } from "lucide-react";
import { DifficultyTag } from "@/components/difficulty-tag";
import { HillPhoto } from "@/components/hill-photo";
import { ScoreBadge } from "@/components/score-badge";
import { WeatherIcon } from "@/components/weather-icon";
import { formatDuration } from "@/lib/dates";
import type { DayScore, DestinationScore } from "@/lib/scoring";
import { cn } from "@/lib/utils";

export interface ResultItem {
  score: DestinationScore;
  /** The searched-for day; null when there's no forecast for it yet. */
  day: DayScore | null;
}

export function ResultCards({ items, onOpen }: { items: ResultItem[]; onOpen: (id: string) => void }) {
  return (
    <ul className="grid gap-x-6 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
      {items.map(({ score, day }) => {
        const { mountain, drive } = score.destination;
        const s = day?.summary;
        const vetoed = !!day?.vetoes.length;
        return (
          <li key={mountain.id}>
            <button
              type="button"
              onClick={() => onOpen(mountain.id)}
              className="group flex h-full w-full flex-col rounded-xl text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-moss"
            >
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-dune/50">
                <HillPhoto
                  id={mountain.id}
                  alt={`${mountain.name}, ${mountain.area}`}
                  className={cn("size-full transition-transform duration-250 ease-out group-hover:scale-[1.03]", vetoed && "grayscale-[60%]")}
                />
                {day && <ScoreBadge score={day.total} size="md" className="absolute left-3 top-3" />}
                {s && (
                  <span className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-surface/95 px-2.5 py-1 text-xs font-semibold text-bark">
                    <WeatherIcon condition={s.condition} className="size-3.5" />
                    {Math.round(s.minTempC)}–{Math.round(s.maxTempC)}°
                  </span>
                )}
                {vetoed && (
                  <span className="absolute inset-x-3 bottom-3 flex items-start gap-1.5 rounded-lg bg-clay/95 px-2.5 py-1.5 text-xs font-semibold text-surface">
                    <ShieldAlert className="mt-px size-3.5 shrink-0" />
                    Not recommended: {day.vetoes[0]}
                  </span>
                )}
              </div>
              <div className="mt-3 flex items-center gap-2 text-sm">
                <DifficultyTag difficulty={mountain.difficulty} />
                <span className="truncate text-muted-foreground">{mountain.area}</span>
              </div>
              <h3 className="mt-1.5 text-lg font-bold text-bark group-hover:text-moss">{mountain.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {mountain.walkingHours} · {mountain.summit.elevationM} m
              </p>
              <p className="mt-auto flex flex-wrap items-center gap-x-3 pt-2 text-sm text-bark">
                <span>
                  {formatDuration(drive.minutes)} drive{drive.method === "estimate" && <span title="Estimated drive time"> ≈</span>}
                </span>
                {score.needsOvernight && (
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Moon className="size-3.5" />
                    Overnight
                  </span>
                )}
                {s ? (
                  <>
                    <span className={cn(s.maxPrecipProb >= 30 && "font-semibold text-lake")}>{s.maxPrecipProb}% rain</span>
                    <span>Gusts {s.maxGustMph} mph</span>
                  </>
                ) : (
                  <span className="text-muted-foreground">No forecast yet</span>
                )}
              </p>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
