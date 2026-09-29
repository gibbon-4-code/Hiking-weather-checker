import type { Condition, DestinationForecast, Mountain, Slot } from "@/lib/types";
import { groupIntoDays } from "./shared";

/** Small deterministic PRNG so demo data is stable between reloads. */
function seeded(seed: string) {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

/** Plausible made-up forecasts, used only when every real source is unavailable. */
export function demoForecast(mountain: Mountain, dates: string[]): DestinationForecast {
  const slots: Slot[] = [];
  for (const date of dates) {
    const rand = seeded(`${mountain.id}:${date}`);
    const wetness = rand();
    const windiness = rand();
    const baseTemp = 14 - mountain.summit.elevationM * 0.0065 - (mountain.summit.lat - 50) * 0.6;
    for (let hour = 5; hour <= 20; hour++) {
      const precipProb = Math.round(Math.min(95, wetness * 90 + rand() * 15));
      const gust = Math.round(10 + windiness * 30 + mountain.summit.elevationM / 60 + rand() * 8);
      const condition: Condition =
        precipProb > 70 ? "rain" : precipProb > 45 ? "drizzle" : wetness < 0.25 ? "clear" : "partly-cloudy";
      const temp = baseTemp + Math.sin(((hour - 8) / 12) * Math.PI) * 3;
      slots.push({
        time: `${date}T${String(hour).padStart(2, "0")}:00:00Z`,
        hours: 1,
        tempC: Math.round(temp * 10) / 10,
        feelsLikeC: Math.round((temp - gust / 10) * 10) / 10,
        windMph: Math.round(gust * 0.65),
        gustMph: gust,
        precipProb,
        precipMm: precipProb > 45 ? Math.round(rand() * 20) / 10 : 0,
        visibilityM: precipProb > 70 ? 3000 : 20000,
        thunderProb: null,
        condition,
      });
    }
  }
  return { source: "demo", issuedAt: null, modelElevationM: null, days: groupIntoDays(slots, dates, {}) };
}
