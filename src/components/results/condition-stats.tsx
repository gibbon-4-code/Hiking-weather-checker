import { formatDuration } from "@/lib/dates";
import type { DaySummary, DestinationScore } from "@/lib/scoring";
import { cn } from "@/lib/utils";

/** The big numbers for a day on the hill; `extended` adds the drive and the walk. */
export function ConditionStats({
  summary: s,
  score,
  tone = "light",
  extended = false,
  className,
}: {
  summary: DaySummary;
  score?: DestinationScore;
  tone?: "light" | "dark";
  extended?: boolean;
  className?: string;
}) {
  const dark = tone === "dark";
  const stats = [
    { label: "Summit", value: `${Math.round(s.minTempC)}–${Math.round(s.maxTempC)}°`, sub: `feels ${Math.round(s.minFeelsLikeC)}°` },
    { label: "Rain", value: `${s.maxPrecipProb}%`, sub: `${s.precipMm} mm` },
    { label: "Gusts", value: `${s.maxGustMph}`, sub: `mph · wind ${s.maxWindMph}` },
  ];
  if (extended && score) {
    const { mountain, drive } = score.destination;
    const [time, distance] = mountain.walkingHours.split(" · ");
    stats.push(
      { label: "Drive", value: formatDuration(drive.minutes), sub: score.needsOvernight ? "worth an overnight" : "each way" },
      { label: "Walk", value: distance ?? time, sub: distance ? `est. ${time}` : "" },
    );
  }
  return (
    <dl className={cn("grid gap-x-4 gap-y-4", extended ? "grid-cols-3 sm:grid-cols-5" : "grid-cols-3", className)}>
      {stats.map((st) => (
        <div key={st.label}>
          <dt className={cn("text-xs font-medium", dark ? "text-white/75" : "text-muted-foreground")}>{st.label}</dt>
          <dd className={cn("mt-0.5 font-display text-2xl font-bold tabular-nums", dark ? "text-surface" : "text-bark")}>
            {st.value}
          </dd>
          <dd className={cn("text-xs", dark ? "text-white/75" : "text-muted-foreground")}>{st.sub}</dd>
        </div>
      ))}
    </dl>
  );
}
