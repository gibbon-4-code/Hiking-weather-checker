import { BRIGHTON, MOUNTAINS } from "@/data/mountains";
import type { ScoutAnswer } from "@/lib/agent/guardrail";
import { estimateDrive } from "@/lib/providers/routing";
import type { DayForecast, Mountain, PlanResponse, Slot } from "@/lib/types";

/** Shared test data for the agent's tests: a fixed "today", that weekend, and a known plan. */

const byId = (id: string) => MOUNTAINS.find((m) => m.id === id) as Mountain;
export const TODAY = new Date("2026-09-29T09:00:00Z");
export const SATURDAY = "2026-10-03";
export const WEEKEND = [SATURDAY, "2026-10-04"];

function day(date: string, over: Partial<Slot> = {}): DayForecast {
  const slots: Slot[] = [];
  for (let h = 7; h <= 18; h++) {
    slots.push({
      time: `${date}T${String(h - 1).padStart(2, "0")}:00:00Z`,
      hours: 1,
      tempC: 12,
      feelsLikeC: 10,
      windMph: 10,
      gustMph: 15,
      precipProb: 10,
      precipMm: 0,
      visibilityM: 30000,
      thunderProb: null,
      condition: "clear",
      ...over,
    });
  }
  return { date, slots, sunrise: null, sunset: null };
}

/**
 * A plan for Saturday where Tryfan, an exposed ridge, has 60 mph gusts and everywhere else is calm.
 * `source` says where the forecasts came from: "demo" means no real forecast was available.
 */
export function plan(source: "openmeteo" | "demo" = "openmeteo"): PlanResponse {
  return {
    generatedAt: TODAY.toISOString(),
    home: BRIGHTON,
    day: { date: SATURDAY, daysAway: 4 },
    destinations: ["ditchling-beacon", "tryfan"].map((id) => {
      const mountain = byId(id);
      return {
        mountain,
        forecast: {
          source,
          issuedAt: null,
          modelElevationM: null,
          days: [day(SATURDAY, id === "tryfan" ? { gustMph: 60, windMph: 40 } : {})],
        },
        drive: estimateDrive(BRIGHTON, mountain),
      };
    }),
    notices: [],
    keys: { metOffice: false, routing: false },
    secondOpinion: false,
  };
}

/** A valid answer: Ditchling Beacon on Saturday. Override any field. */
export const answer = (over: Partial<ScoutAnswer> = {}): ScoutAnswer => ({
  verdict: "go",
  mountainId: "ditchling-beacon",
  date: SATURDAY,
  headline: "Go to Ditchling Beacon on Saturday.",
  reasons: ["Light winds"],
  confidence: "high",
  ...over,
});
