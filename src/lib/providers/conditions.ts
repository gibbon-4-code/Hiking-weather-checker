import type { Condition } from "@/lib/types";

/** Met Office DataHub significant weather codes (0–30, -1 for trace rain). */
export function metOfficeCondition(code: number): Condition {
  if (code === 0 || code === 1) return "clear";
  if (code === 2 || code === 3) return "partly-cloudy";
  if (code === 5 || code === 6) return "fog";
  if (code === 7 || code === 8) return "cloudy";
  if (code === -1 || code === 11) return "drizzle";
  if (code === 9 || code === 10 || code === 12) return "rain";
  if (code >= 13 && code <= 15) return "heavy-rain";
  if (code >= 16 && code <= 21) return "sleet";
  if (code >= 22 && code <= 24) return "snow";
  if (code >= 25 && code <= 27) return "heavy-snow";
  if (code >= 28 && code <= 30) return "thunder";
  return "cloudy";
}

/** WMO weather interpretation codes, as used by Open-Meteo. */
export function wmoCondition(code: number): Condition {
  if (code <= 1) return "clear";
  if (code === 2) return "partly-cloudy";
  if (code === 3) return "cloudy";
  if (code === 45 || code === 48) return "fog";
  if (code >= 51 && code <= 57) return "drizzle";
  if (code === 61 || code === 80) return "rain";
  if (code === 63 || code === 65 || code === 81 || code === 82) return "heavy-rain";
  if (code === 66 || code === 67) return "sleet";
  if (code === 71 || code === 77 || code === 85) return "snow";
  if (code === 73 || code === 75 || code === 86) return "heavy-snow";
  if (code >= 95) return "thunder";
  return "cloudy";
}

const SEVERITY: Condition[] = [
  "clear",
  "partly-cloudy",
  "cloudy",
  "drizzle",
  "fog",
  "rain",
  "sleet",
  "snow",
  "heavy-rain",
  "heavy-snow",
  "thunder",
];

export function conditionSeverity(c: Condition) {
  return SEVERITY.indexOf(c);
}

export const CONDITION_LABEL: Record<Condition, string> = {
  clear: "Sunny",
  "partly-cloudy": "Sunny spells",
  cloudy: "Cloudy",
  fog: "Hill fog",
  drizzle: "Drizzle",
  rain: "Rain",
  "heavy-rain": "Heavy rain",
  sleet: "Sleet",
  snow: "Snow",
  "heavy-snow": "Heavy snow",
  thunder: "Thunderstorms",
};
