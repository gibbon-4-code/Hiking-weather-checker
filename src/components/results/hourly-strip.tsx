import { WeatherIcon } from "@/components/weather-icon";
import { londonParts } from "@/lib/dates";
import type { Slot } from "@/lib/types";
import { cn } from "@/lib/utils";

const FIRST_HOUR = 7;
const LAST_HOUR = 18;
/** How long a walk the "best window" is looking for. */
const WINDOW_HOURS = 6;

/** The daylight hours on the summit, with the driest, calmest stretch highlighted. */
export function HourlyStrip({ slots, tone = "light" }: { slots: Slot[]; tone?: "light" | "dark" }) {
  const hours = slots
    .map((s) => ({ ...s, hour: londonParts(s.time).hour }))
    .filter((s) => s.hour >= FIRST_HOUR && s.hour <= LAST_HOUR);
  if (hours.length < 2) return null;

  const dark = tone === "dark";
  const window = bestWindow(hours);
  const maxRain = Math.max(30, ...hours.map((h) => h.precipProb));

  return (
    <figure>
      <figcaption
        className={cn("mb-3 flex flex-wrap items-baseline justify-between gap-2 text-sm", dark ? "text-white/80" : "text-muted-foreground")}
      >
        <span className={cn("font-semibold", dark ? "text-surface" : "text-bark")}>Hour by hour on the summit</span>
        <span className="flex items-center gap-1.5 text-xs">
          <span className={cn("inline-block h-2.5 w-3.5 rounded-sm", dark ? "bg-white/15" : "bg-moss/15")} aria-hidden="true" />
          Best window {pad(window.start)}:00–{pad(window.end)}:00
        </span>
      </figcaption>
      <div className="grid" style={{ gridTemplateColumns: `repeat(${hours.length}, minmax(0, 1fr))` }}>
        {hours.map((h) => {
          const inWindow = h.hour >= window.start && h.hour < window.end;
          return (
            <div
              key={h.time}
              className={cn(
                "flex flex-col items-center gap-2 py-2.5 first:rounded-l-lg last:rounded-r-lg",
                inWindow && (dark ? "bg-white/10" : "bg-moss/10"),
              )}
              aria-label={`${pad(h.hour)}:00, ${Math.round(h.tempC)} degrees, ${h.precipProb}% rain, gusts ${h.gustMph} mph`}
            >
              <WeatherIcon condition={h.condition} tone={tone} className="size-4" />
              <span className={cn("text-sm font-semibold tabular-nums", dark ? "text-surface" : "text-bark")}>
                {Math.round(h.tempC)}°
              </span>
              <div className="flex h-9 w-full items-end justify-center" aria-hidden="true">
                <div
                  className={cn("w-1.5 rounded-t-sm", dark ? "bg-[#a9c7da]" : "bg-lake/70")}
                  style={{ height: `${Math.max(8, (h.precipProb / maxRain) * 100)}%` }}
                />
              </div>
              <span className={cn("text-[11px] tabular-nums", dark ? "text-white/70" : "text-muted-foreground")}>
                {pad(h.hour)}
              </span>
            </div>
          );
        })}
      </div>
      <p className={cn("mt-2 text-[11px]", dark ? "text-white/70" : "text-muted-foreground")}>Bars show chance of rain</p>
    </figure>
  );
}

/** The run of slots, about six hours long, with the least rain and wind. */
export function bestWindow(hours: (Slot & { hour: number })[]) {
  const slotHours = hours[0].hours;
  const length = Math.min(hours.length, Math.max(1, Math.round(WINDOW_HOURS / slotHours)));
  let bestStart = 0;
  let bestCost = Infinity;
  for (let i = 0; i + length <= hours.length; i++) {
    const cost = hours.slice(i, i + length).reduce((sum, h) => sum + h.precipProb + h.gustMph * 0.2, 0);
    if (cost < bestCost) {
      bestCost = cost;
      bestStart = i;
    }
  }
  const last = hours[bestStart + length - 1];
  return { start: hours[bestStart].hour, end: last.hour + last.hours };
}

const pad = (n: number) => n.toString().padStart(2, "0");
