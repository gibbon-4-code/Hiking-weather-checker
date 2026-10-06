import { formatDuration } from "@/lib/dates";
import { CONDITION_LABEL } from "@/lib/providers/conditions";
import { DEFAULT_PREFERENCES, inSearch, scoreDestination, type DaySummary, type Preferences } from "@/lib/scoring";
import type { PlanResponse } from "@/lib/types";

/** One hill in the ranking, trimmed to what a model needs to reason about it. */
export interface RankedHill {
  id: string;
  name: string;
  area: string;
  score: number;
  difficulty: string;
  exposure: string;
  drive: string;
  overnight: boolean;
  weather: string;
  vetoes: string[];
}

/**
 * Scores a plan the same way the results page does (`scoreDestination`), and keeps the top few
 * hills. The browser normally does this; the agent needs it on the server.
 */
export function rankDay(
  plan: PlanResponse,
  prefs: Preferences = DEFAULT_PREFERENCES,
  limit = 10,
  today: Date = new Date(),
): RankedHill[] {
  return plan.destinations
    .map((d) => scoreDestination(d, prefs, today))
    .filter((s) => inSearch(s) && s.best)
    .sort((a, b) => b.best!.total - a.best!.total)
    .slice(0, limit)
    .map((s) => {
      const day = s.best!;
      const m = s.destination.mountain;
      return {
        id: m.id,
        name: m.name,
        area: m.area,
        score: day.total,
        difficulty: m.difficulty,
        exposure: m.exposure,
        drive: formatDuration(s.destination.drive.minutes),
        overnight: s.needsOvernight,
        weather: describeWeather(day.summary),
        vetoes: day.vetoes,
      };
    });
}

/** One line on the walking-hours weather, for a prompt. */
export function describeWeather(x: DaySummary): string {
  return (
    `${CONDITION_LABEL[x.condition]}, rain chance up to ${x.maxPrecipProb}%, ` +
    `gusts ${x.maxGustMph} mph, ${Math.round(x.minTempC)}–${Math.round(x.maxTempC)}°C ` +
    `(feels like ${Math.round(x.minFeelsLikeC)}°C)`
  );
}

/** The ranking as plain text, one hill per line, for putting in a prompt. */
export function formatRanking(date: string, hills: RankedHill[]): string {
  if (!hills.length) return `No hills fit the search for ${date}.`;
  const lines = hills.map(
    (h, i) =>
      `${i + 1}. ${h.name} (${h.area}) [id: ${h.id}], score ${h.score}/100, ${h.difficulty}, ${h.exposure} exposure, ` +
      `${h.drive} drive${h.overnight ? " (overnight stay advised)" : ""}. ${h.weather}.` +
      (h.vetoes.length ? ` UNSAFE: ${h.vetoes.join("; ")}.` : ""),
  );
  return `Top hills for ${date}:\n${lines.join("\n")}`;
}
