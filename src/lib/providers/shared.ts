import { londonParts } from "@/lib/dates";
import type { DayForecast, Slot } from "@/lib/types";

/** Daylight hours worth showing in the day view, in UK time. */
const FIRST_HOUR = 6;
const LAST_HOUR = 21;

export function groupIntoDays(
  slots: Slot[],
  dates: string[],
  sun: Record<string, { sunrise: string | null; sunset: string | null }>,
): DayForecast[] {
  return dates.map((date) => ({
    date,
    slots: slots.filter((s) => {
      const p = londonParts(s.time);
      return p.date === date && p.hour >= FIRST_HOUR && p.hour <= LAST_HOUR;
    }),
    sunrise: sun[date]?.sunrise ?? null,
    sunset: sun[date]?.sunset ?? null,
  }));
}

export function coversWalkingDay(day: DayForecast) {
  return day.slots.some((s) => londonParts(s.time).hour <= 10) &&
    day.slots.some((s) => londonParts(s.time).hour >= 14);
}
