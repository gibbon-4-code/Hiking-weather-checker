import type { DestinationForecast, Mountain, Slot } from "@/lib/types";
import { wmoCondition } from "./conditions";
import { groupIntoDays } from "./shared";

const BASE = "https://api.open-meteo.com/v1/forecast";
const HOURLY = [
  "temperature_2m",
  "apparent_temperature",
  "precipitation_probability",
  "precipitation",
  "weather_code",
  "wind_speed_10m",
  "wind_gusts_10m",
  "visibility",
] as const;

interface OpenMeteoLocation {
  elevation: number;
  hourly: Record<(typeof HOURLY)[number], (number | null)[]> & { time: string[] };
  daily: { time: string[]; sunrise: string[]; sunset: string[] };
}

const utc = (t: string) => (t.endsWith("Z") ? t : `${t}:00Z`);

export function normaliseOpenMeteo(loc: OpenMeteoLocation, dates: string[]): DestinationForecast {
  const h = loc.hourly;
  const slots: Slot[] = h.time.map((t, i) => ({
    time: utc(t),
    hours: 1,
    tempC: h.temperature_2m[i] ?? 0,
    feelsLikeC: h.apparent_temperature[i] ?? h.temperature_2m[i] ?? 0,
    windMph: Math.round(h.wind_speed_10m[i] ?? 0),
    gustMph: Math.round(h.wind_gusts_10m[i] ?? 0),
    precipProb: h.precipitation_probability[i] ?? 0,
    precipMm: h.precipitation[i] ?? 0,
    visibilityM: h.visibility[i] ?? null,
    thunderProb: null,
    condition: wmoCondition(h.weather_code[i] ?? 3),
  }));

  const sun = Object.fromEntries(
    loc.daily.time.map((d, i) => [
      d,
      { sunrise: utc(loc.daily.sunrise[i]), sunset: utc(loc.daily.sunset[i]) },
    ]),
  );

  return {
    source: "openmeteo",
    issuedAt: null,
    modelElevationM: loc.elevation,
    days: groupIntoDays(slots, dates, sun),
  };
}

/** One batched request covers every destination, forecast at each summit's own height. */
export async function fetchOpenMeteo(
  mountains: Mountain[],
  dates: string[],
): Promise<DestinationForecast[]> {
  const params = new URLSearchParams({
    latitude: mountains.map((m) => m.summit.lat).join(","),
    longitude: mountains.map((m) => m.summit.lon).join(","),
    elevation: mountains.map((m) => m.summit.elevationM).join(","),
    hourly: HOURLY.join(","),
    daily: "sunrise,sunset",
    wind_speed_unit: "mph",
    timezone: "UTC",
    start_date: dates[0],
    end_date: dates[dates.length - 1],
  });
  const res = await fetch(`${BASE}?${params}`, { next: { revalidate: 3600 } });
  if (!res.ok) throw new Error(`Open-Meteo ${res.status}`);
  const body = (await res.json()) as OpenMeteoLocation | OpenMeteoLocation[];
  const list = Array.isArray(body) ? body : [body];
  return list.map((loc) => normaliseOpenMeteo(loc, dates));
}
