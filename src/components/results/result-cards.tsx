import { Moon, ShieldAlert } from "lucide-react";
import { DifficultyTag } from "@/components/difficulty-tag";
import { HillPhoto } from "@/components/hill-photo";
import { TripFacts } from "@/components/trip-facts";
import { WeatherRating } from "@/components/weather-rating";
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
        const { mountain } = score.destination;
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
                {day ? (
                  <WeatherRating day={day} size="md" className="absolute left-3 top-3" />
                ) : (
                  <span className="absolute left-3 top-3 rounded-full bg-surface/95 px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                    No forecast yet
                  </span>
                )}
                {score.needsOvernight && (
                  <span className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-surface/95 px-2.5 py-1 text-xs font-semibold text-bark">
                    <Moon className="size-3.5" aria-hidden="true" />
                    Overnight
                  </span>
                )}
                {vetoed && (
                  <span className="absolute inset-x-3 bottom-3 flex items-start gap-1.5 rounded-lg bg-clay/95 px-2.5 py-1.5 text-xs font-semibold text-surface">
                    <ShieldAlert className="mt-px size-3.5 shrink-0" />
                    Not recommended: {day.vetoes[0]}
                  </span>
                )}
              </div>
              <h3 className="mt-3.5 font-display text-xl font-extrabold leading-tight text-bark transition-colors group-hover:text-moss">
                {mountain.name}
              </h3>
              <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                <DifficultyTag difficulty={mountain.difficulty} />
                <span className="truncate">
                  {mountain.area} · {mountain.summit.elevationM} m
                </span>
              </div>
              <div className="mt-auto pt-3">
                <TripFacts score={score} className="border-t border-dune/60 pt-3" />
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
