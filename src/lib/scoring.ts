import { formatDuration, londonParts } from "@/lib/dates";
import { conditionSeverity } from "@/lib/providers/conditions";
import type { Condition, DayForecast, Exposure, Mountain, Destination } from "@/lib/types";

export interface Weights {
  weather: number;
  travel: number;
  quality: number;
}

export interface Preferences {
  weights: Weights;
  /** null means no limit. */
  maxDriveMinutes: number | null;
}

export const DEFAULT_PREFERENCES: Preferences = {
  weights: { weather: 60, travel: 20, quality: 20 },
  maxDriveMinutes: null,
};

/** Only the hours you'd actually be on the hill count towards the score. */
const WALK_START = 9;
const WALK_END = 16;
export const OVERNIGHT_MINUTES = 210;

const EXPOSURE_FACTOR: Record<Exposure, number> = { low: 0.6, medium: 0.8, high: 1, extreme: 1.15 };

export interface DaySummary {
  date: string;
  maxPrecipProb: number;
  precipMm: number;
  maxGustMph: number;
  maxWindMph: number;
  minFeelsLikeC: number;
  maxTempC: number;
  minTempC: number;
  minVisibilityM: number | null;
  maxThunderProb: number | null;
  condition: Condition;
}

export function summariseDay(day: DayForecast): DaySummary | null {
  const inWindow = day.slots.filter((s) => {
    const h = londonParts(s.time).hour;
    return h + s.hours > WALK_START && h <= WALK_END;
  });
  if (!inWindow.length) return null;
  const vis = inWindow.map((s) => s.visibilityM).filter((v): v is number => v !== null);
  const thunder = inWindow.map((s) => s.thunderProb).filter((v): v is number => v !== null);
  const worst = inWindow.reduce((a, s) =>
    conditionSeverity(s.condition) > conditionSeverity(a.condition) ? s : a,
  );
  return {
    date: day.date,
    maxPrecipProb: Math.max(...inWindow.map((s) => s.precipProb)),
    precipMm: round1(inWindow.reduce((sum, s) => sum + s.precipMm, 0)),
    maxGustMph: Math.max(...inWindow.map((s) => s.gustMph)),
    maxWindMph: Math.max(...inWindow.map((s) => s.windMph)),
    minFeelsLikeC: Math.min(...inWindow.map((s) => s.feelsLikeC)),
    maxTempC: Math.max(...inWindow.map((s) => s.tempC)),
    minTempC: Math.min(...inWindow.map((s) => s.tempC)),
    minVisibilityM: vis.length ? Math.min(...vis) : null,
    maxThunderProb: thunder.length ? Math.max(...thunder) : null,
    condition: worst.condition,
  };
}

const CONDITION_PENALTY: Partial<Record<Condition, number>> = {
  fog: 10,
  sleet: 10,
  snow: 12,
  "heavy-rain": 15,
  "heavy-snow": 25,
  thunder: 35,
};

export function weatherScore(s: DaySummary, mountain: Mountain) {
  const effectiveGust = s.maxGustMph * EXPOSURE_FACTOR[mountain.exposure];
  let score = 100;
  score -= Math.max(0, s.maxPrecipProb - 20) * 0.45;
  score -= Math.min(30, s.precipMm * 4);
  score -= Math.min(40, Math.max(0, effectiveGust - 20) * 1.1);
  if (s.minFeelsLikeC < 0) score -= Math.min(20, -s.minFeelsLikeC * 2.5);
  if (s.maxTempC > 26) score -= (s.maxTempC - 26) * 2;
  if (s.minVisibilityM !== null) {
    if (s.minVisibilityM < 1000) score -= 15;
    else if (s.minVisibilityM < 4000) score -= 8;
  }
  score -= CONDITION_PENALTY[s.condition] ?? 0;
  return clamp(Math.round(score), 0, 100);
}

/** Hard stops: situations where the score shouldn't matter because the hill isn't safe. */
export function safetyVetoes(s: DaySummary, mountain: Mountain): string[] {
  const reasons: string[] = [];
  const exposed = mountain.exposure === "high" || mountain.exposure === "extreme";
  if ((exposed && s.maxGustMph >= 50) || s.maxGustMph >= 60) {
    reasons.push(`Summit gusts ${s.maxGustMph} mph`);
  }
  if (s.condition === "thunder" || (exposed && (s.maxThunderProb ?? 0) >= 40)) {
    reasons.push("Thunderstorms on exposed ground");
  }
  if (s.condition === "heavy-snow" && mountain.difficulty === "Hard") {
    reasons.push("Heavy snow: winter skills and kit needed");
  }
  if (s.minFeelsLikeC <= -12) reasons.push(`Feels like ${Math.round(s.minFeelsLikeC)}°C with wind chill`);
  return reasons;
}

export function travelScore(minutes: number) {
  return clamp(Math.round(100 - (Math.max(0, minutes - 60) / 480) * 80), 10, 100);
}

/** A big mountain day is only a better day if the weather lets you enjoy it. */
export function qualityScore(mountain: Mountain, weather: number) {
  return Math.round((mountain.quality / 5) * 100 * (0.4 + 0.6 * (weather / 100)));
}

/** Forecasts lose skill with lead time, so distant scores are pulled towards "average". */
export function confidence(daysAhead: number) {
  const pull = clamp(0.1 * (daysAhead - 3), 0, 0.4);
  const label: "High" | "Medium" | "Low" = daysAhead <= 2 ? "High" : daysAhead <= 4 ? "Medium" : "Low";
  return { pull, label };
}

export interface DayScore {
  date: string;
  summary: DaySummary;
  weather: number;
  travel: number;
  quality: number;
  total: number;
  vetoes: string[];
  confidence: "High" | "Medium" | "Low";
}

export interface DestinationScore {
  destination: Destination;
  days: DayScore[];
  best: DayScore | null;
  needsOvernight: boolean;
  beyondMaxDrive: boolean;
}

export function scoreDestination(
  d: Destination,
  prefs: Preferences,
  today: Date = new Date(),
): DestinationScore {
  const w = prefs.weights;
  const weightSum = w.weather + w.travel + w.quality || 1;
  const travel = travelScore(d.drive.minutes);
  const todayStr = londonParts(today).date;

  const days: DayScore[] = d.forecast.days.flatMap((day) => {
    const summary = summariseDay(day);
    if (!summary) return [];
    const daysAhead = Math.round(
      (Date.parse(`${day.date}T12:00:00Z`) - Date.parse(`${todayStr}T12:00:00Z`)) / 86400000,
    );
    const conf = confidence(daysAhead);
    const rawWeather = weatherScore(summary, d.mountain);
    const weather = Math.round(rawWeather * (1 - conf.pull) + 60 * conf.pull);
    const quality = qualityScore(d.mountain, weather);
    const total = Math.round((w.weather * weather + w.travel * travel + w.quality * quality) / weightSum);
    return [
      {
        date: day.date,
        summary,
        weather,
        travel,
        quality,
        total,
        vetoes: safetyVetoes(summary, d.mountain),
        confidence: conf.label,
      },
    ];
  });

  const safe = days.filter((x) => !x.vetoes.length);
  const best = [...(safe.length ? safe : days)].sort((a, b) => b.total - a.total)[0] ?? null;
  return {
    destination: d,
    days,
    best,
    needsOvernight: d.drive.minutes > OVERNIGHT_MINUTES,
    beyondMaxDrive: prefs.maxDriveMinutes !== null && d.drive.minutes > prefs.maxDriveMinutes,
  };
}

export interface Pick {
  score: DestinationScore;
  day: DayScore;
  reasons: string[];
}

export interface Recommendation {
  pick: Pick | null;
  runnerUp: (Pick & { why: string }) | null;
}

const eligible = (s: DestinationScore) => !s.beyondMaxDrive && s.days.some((d) => !d.vetoes.length);

function bestSafeDay(s: DestinationScore) {
  return s.days.filter((d) => !d.vetoes.length).sort((a, b) => b.total - a.total)[0];
}

export function recommend(scores: DestinationScore[]): Recommendation {
  const ranked = scores
    .filter(eligible)
    .map((s) => ({ s, day: bestSafeDay(s) }))
    .sort((a, b) => b.day.total - a.day.total);
  if (!ranked.length) return { pick: null, runnerUp: null };

  const top = ranked[0];
  const pick: Pick = { score: top.s, day: top.day, reasons: explain(top.s, top.day) };

  const rest = ranked.slice(1);
  const dayTrip = top.s.needsOvernight ? rest.find((r) => !r.s.needsOvernight) : undefined;
  const second = dayTrip ?? rest[0];
  const runnerUp = second
    ? {
        score: second.s,
        day: second.day,
        reasons: explain(second.s, second.day),
        why: dayTrip ? "If you'd rather not stay overnight" : "Also worth a look",
      }
    : null;
  return { pick, runnerUp };
}

export function explain(s: DestinationScore, day: DayScore): string[] {
  const x = day.summary;
  const reasons: { weight: number; text: string }[] = [];

  if (x.maxPrecipProb <= 20) reasons.push({ weight: 3, text: `Low chance of rain (${x.maxPrecipProb}%)` });
  else if (x.precipMm < 1) reasons.push({ weight: 1, text: `Mostly dry: under 1 mm expected while you walk` });

  if (x.maxGustMph <= 25) reasons.push({ weight: 3, text: `Light winds, gusts only ${x.maxGustMph} mph on top` });
  else if (x.maxGustMph <= 35) reasons.push({ weight: 1, text: `Manageable breeze, gusts to ${x.maxGustMph} mph` });

  if (x.condition === "clear" || x.condition === "partly-cloudy") {
    reasons.push({ weight: 2, text: "Sunshine expected, so the views should be good" });
  }
  if (x.minVisibilityM !== null && x.minVisibilityM >= 20000) {
    reasons.push({ weight: 1, text: "Good visibility" });
  }

  const drive = formatDuration(s.destination.drive.minutes);
  if (s.needsOvernight) reasons.push({ weight: 1, text: `${drive} drive, so worth booking a night in ${s.destination.mountain.stayNear}` });
  else reasons.push({ weight: 2, text: `Only ${drive} away, an easy day trip` });

  if (s.destination.mountain.quality >= 5) reasons.push({ weight: 2, text: "One of the best mountain days on the list" });

  return reasons
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 4)
    .map((r) => r.text);
}

export function scoreTone(score: number) {
  if (score >= 75) return "great" as const;
  if (score >= 55) return "good" as const;
  if (score >= 35) return "mixed" as const;
  return "poor" as const;
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}
