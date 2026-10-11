import { readFileSync } from "node:fs";
import type { ScoutSource } from "@/lib/agent/tools";
import { demoForecast } from "@/lib/providers/demo";
import type { Destination, DestinationForecast, PlanResponse, Slot } from "@/lib/types";

/**
 * Turns a test case's "recipe" into data the Scout can run on. Every case starts from the same
 * frozen weekend (evals/scout/snapshot.json) and changes only what the case describes.
 */

type Day = "sat" | "sun";

export interface Change {
  days: Day[];
  /** Which hills: "all", a list of ids, or every hill in these areas. */
  hills?: "all" | string[];
  areas?: string[];
  /** Overwrite these fields on every forecast hour. */
  set?: Partial<Omit<Slot, "time" | "hours">>;
  /** Replace the forecast with demo data, as when the weather service is down. */
  demo?: true;
  /** Put the hill back to the real snapshot forecast (undoing an earlier change). */
  restore?: true;
  /** Second opinions only: return the same forecast as the ranking uses. */
  matchForecast?: true;
}

export interface Expect {
  /** The final verdict must be one of these. */
  verdict: ("go" | "wait" | "skip")[];
  /** A go or wait must be for this day. */
  day?: Day;
  /** If the verdict is go, it must be for this day. */
  dayIfGo?: Day;
  /** The pick must be one of these hills. */
  mountain?: string[];
  /** The pick must not be any of these hills. */
  notMountain?: string[];
  /** The pick must not be in any of these areas. */
  notArea?: string[];
  /** The pick must be in the top N of the app's own ranking for that day. */
  pickInTopOfDay?: number;
  /** These tools must have been called at least once. */
  calls?: string[];
  /** If the pick is this hill, the headline or reasons must match this pattern. */
  mentionsIfMountain?: Record<string, string>;
}

export interface EvalCase {
  id: string;
  tag: string;
  description: string;
  changes: Change[];
  secondOpinion?: Change[];
  expect: Expect;
}

interface Snapshot {
  capturedAt: string;
  plans: Record<string, PlanResponse>;
}

const DEMO_NOTICE = "Some or all forecasts are demo data because no live weather source could cover this day.";

export function loadSnapshot(path = "evals/scout/snapshot.json"): Snapshot {
  return JSON.parse(readFileSync(path, "utf8"));
}

export function loadCases(path = "evals/scout/cases.json"): EvalCase[] {
  return JSON.parse(readFileSync(path, "utf8"));
}

/** The snapshot's Saturday and Sunday dates. */
export function weekendOf(snapshot: Snapshot): Record<Day, string> {
  const [sat, sun] = Object.keys(snapshot.plans).sort();
  return { sat, sun };
}

const matches = (change: Change, d: Destination) =>
  change.hills === "all" ||
  (Array.isArray(change.hills) && change.hills.includes(d.mountain.id)) ||
  (change.areas?.includes(d.mountain.area) ?? false);

function applyTo(forecast: DestinationForecast, change: Change, original: DestinationForecast, d: Destination, date: string) {
  if (change.restore) return original;
  if (change.demo) return demoForecast(d.mountain, [date]);
  if (change.set) {
    const set = change.set;
    return { ...forecast, days: forecast.days.map((day) => ({ ...day, slots: day.slots.map((s) => ({ ...s, ...set })) })) };
  }
  return forecast;
}

/** The two plans for this case: the snapshot with the case's changes applied. */
export function buildPlans(snapshot: Snapshot, c: EvalCase): Record<string, PlanResponse> {
  const week = weekendOf(snapshot);
  const plans: Record<string, PlanResponse> = {};
  for (const day of ["sat", "sun"] as Day[]) {
    const date = week[day];
    const original = snapshot.plans[date];
    const destinations = original.destinations.map((d) => {
      let forecast = d.forecast;
      for (const change of c.changes) {
        if (change.days.includes(day) && matches(change, d)) forecast = applyTo(forecast, change, d.forecast, d, date);
      }
      return { ...d, forecast };
    });
    const hasDemo = destinations.some((d) => d.forecast.source === "demo");
    plans[date] = {
      ...original,
      destinations,
      notices: hasDemo ? [...original.notices.filter((n) => n !== DEMO_NOTICE), DEMO_NOTICE] : original.notices,
    };
  }
  return plans;
}

/** A data source that serves the case's frozen plans and second opinions, at the snapshot's "today". */
export function caseSource(snapshot: Snapshot, c: EvalCase): ScoutSource {
  const week = weekendOf(snapshot);
  const plans = buildPlans(snapshot, c);
  return {
    now: () => new Date(snapshot.capturedAt),
    plan: async (date) => {
      const plan = plans[date];
      if (!plan) throw new Error(`The eval only has forecasts for ${week.sat} and ${week.sun}, not ${date}.`);
      return plan;
    },
    secondOpinion: async (mountainId, date) => {
      const day = (Object.keys(week) as Day[]).find((k) => week[k] === date);
      const destination = plans[date]?.destinations.find((d) => d.mountain.id === mountainId);
      if (!day || !destination) return null;
      const change = c.secondOpinion?.find((ch) => ch.days.includes(day) && matches(ch, destination));
      if (!change) return null;
      const forecast = change.matchForecast ? destination.forecast : applyTo(destination.forecast, change, destination.forecast, destination, date);
      return { ...forecast, source: "metoffice" };
    },
  };
}
