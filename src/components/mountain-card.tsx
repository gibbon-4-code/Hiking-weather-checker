import { BedDouble, Car, ChevronRight, ShieldAlert, Trophy } from "lucide-react";
import { ScoreBadge } from "@/components/score-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WeatherIcon } from "@/components/weather-icon";
import { formatDayName, formatDuration } from "@/lib/dates";
import { CONDITION_LABEL } from "@/lib/providers/conditions";
import type { DayScore, DestinationScore } from "@/lib/scoring";
import { cn } from "@/lib/utils";

const DIFFICULTY_STYLE = {
  Easy: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  Moderate: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  Hard: "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
};

export function MountainCard({
  score,
  visibleDates,
  isPick,
  onOpen,
}: {
  score: DestinationScore;
  visibleDates: string[];
  isPick: boolean;
  onOpen: () => void;
}) {
  const { mountain, drive } = score.destination;
  const days = score.days.filter((d) => visibleDates.includes(d.date));

  return (
    <Card
      className={cn(
        "cursor-pointer transition-shadow hover:shadow-md outline-none focus-visible:ring-2 focus-visible:ring-ring",
        isPick && "ring-2 ring-primary",
        score.beyondMaxDrive && "opacity-60",
      )}
      role="button"
      tabIndex={0}
      aria-label={`Open forecast details for ${mountain.name}`}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2 text-base">
              {mountain.name}
              {isPick && <Trophy className="size-4 text-primary" aria-label="Recommended" />}
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              {mountain.area} · {mountain.summit.elevationM} m
            </p>
          </div>
          <Badge className={DIFFICULTY_STYLE[mountain.difficulty]}>{mountain.difficulty}</Badge>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Car className="size-3.5" />
            {formatDuration(drive.minutes)}
            {drive.method === "estimate" && <span title="Estimated drive time">≈</span>}
          </span>
          {score.needsOvernight && (
            <span className="flex items-center gap-1">
              <BedDouble className="size-3.5" /> Overnight
            </span>
          )}
          {score.beyondMaxDrive && <span className="font-medium text-amber-700">Beyond your drive limit</span>}
        </div>
      </CardHeader>

      <CardContent className={cn("grid gap-2", days.length > 1 ? "grid-cols-2" : "grid-cols-1")}>
        {days.map((d) => (
          <DayTile key={d.date} day={d} />
        ))}
        {days.length === 0 && (
          <p className="col-span-full rounded-lg bg-muted p-3 text-sm text-muted-foreground">
            No forecast available for this day yet.
          </p>
        )}
      </CardContent>

      <div className="flex items-center justify-end px-4 text-xs font-medium text-primary">
        Details <ChevronRight className="size-3.5" />
      </div>
    </Card>
  );
}

function DayTile({ day }: { day: DayScore }) {
  const s = day.summary;
  const vetoed = day.vetoes.length > 0;
  return (
    <div className={cn("rounded-xl border p-3", vetoed ? "border-rose-200 bg-rose-50/60" : "bg-muted/30")}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {formatDayName(day.date, "short")}
        </span>
        <ScoreBadge score={day.total} />
      </div>
      <div className="mt-2 flex items-center gap-2">
        <WeatherIcon condition={s.condition} className="size-7 shrink-0" />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{CONDITION_LABEL[s.condition]}</p>
          <p className="text-xs text-muted-foreground tabular-nums">
            {Math.round(s.minTempC)}–{Math.round(s.maxTempC)}°C on top
          </p>
        </div>
      </div>
      <p className="mt-2 text-xs tabular-nums text-muted-foreground">
        <span className="text-sky-700">{s.maxPrecipProb}% rain</span> · gusts {s.maxGustMph} mph
      </p>
      {vetoed && (
        <p className="mt-2 flex items-start gap-1 text-xs font-medium text-rose-700">
          <ShieldAlert className="mt-px size-3.5 shrink-0" />
          Not recommended: {day.vetoes[0]}
        </p>
      )}
    </div>
  );
}
