import type { DaySummary } from "@/lib/scoring";
import { cn } from "@/lib/utils";

/** The full weather numbers for a day on the hill, for the detail view behind the one-line verdict. */
export function ConditionStats({ summary: s, className }: { summary: DaySummary; className?: string }) {
  const stats = [
    { label: "Summit", value: `${Math.round(s.minTempC)}–${Math.round(s.maxTempC)}°`, sub: `feels ${Math.round(s.minFeelsLikeC)}°` },
    { label: "Rain", value: `${s.maxPrecipProb}%`, sub: `${s.precipMm} mm` },
    { label: "Gusts", value: `${s.maxGustMph}`, sub: `mph · wind ${s.maxWindMph}` },
  ];
  return (
    <dl className={cn("grid grid-cols-3 gap-x-4 gap-y-4", className)}>
      {stats.map((st) => (
        <div key={st.label}>
          <dt className="text-xs font-medium text-muted-foreground">{st.label}</dt>
          <dd className="mt-0.5 font-display text-2xl font-bold tabular-nums text-bark">{st.value}</dd>
          <dd className="text-xs text-muted-foreground">{st.sub}</dd>
        </div>
      ))}
    </dl>
  );
}
