import { FactBlock } from "@/components/fact-block";
import { WeatherIcon } from "@/components/weather-icon";
import { weatherSummary, weatherVerdict, type DayScore, type WeatherVerdict } from "@/lib/scoring";
import { cn } from "@/lib/utils";

const VERDICT_BG: Record<WeatherVerdict, string> = {
  Great: "bg-moss",
  Good: "bg-fern",
  Fair: "bg-ochre",
  Poor: "bg-clay",
};

/**
 * The weather boiled down to one 0–100 score. The blended total (weather, travel, quality) only
 * decides the order, so it never appears here.
 */
export function WeatherRating({
  day,
  size = "sm",
  tone = "light",
  className,
}: {
  day: DayScore;
  size?: "sm" | "md" | "lg";
  tone?: "light" | "dark";
  className?: string;
}) {
  const verdict = weatherVerdict(day.weather);
  const bg = VERDICT_BG[verdict];
  const label = `${verdict} weather, ${day.weather} out of 100`;
  const condition = day.summary.condition;

  if (size === "lg") {
    return (
      <FactBlock
        tone={tone}
        className={className}
        tileClassName={cn(bg, "text-surface")}
        tile={<span className="font-display text-xl font-extrabold tabular-nums">{day.weather}</span>}
        label="Weather on the hill"
        value={verdict}
        srLabel={label}
        sub={
          <>
            <WeatherIcon condition={condition} tone={tone} className="size-4 shrink-0" />
            <span>{weatherSummary(day.summary)}</span>
          </>
        }
      />
    );
  }

  return (
    <span
      aria-label={label}
      title={`${verdict} weather · ${day.weather}/100`}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full font-bold text-surface",
        bg,
        size === "md" ? "h-8 px-3 text-sm" : "h-7 px-2.5 text-xs",
        className,
      )}
    >
      <WeatherIcon condition={condition} tone="dark" className={size === "md" ? "size-4" : "size-3.5"} />
      <span className="tabular-nums">{day.weather}</span>
    </span>
  );
}
