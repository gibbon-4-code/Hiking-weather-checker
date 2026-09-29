import { describe, expect, it } from "vitest";
import { MOUNTAINS } from "@/data/mountains";
import {
  DEFAULT_PREFERENCES,
  recommend,
  safetyVetoes,
  scoreDestination,
  travelScore,
  weatherScore,
  type DaySummary,
} from "@/lib/scoring";
import type { Condition, DayForecast, Mountain, Slot, WeekendDestination } from "@/lib/types";

const byId = (id: string) => MOUNTAINS.find((m) => m.id === id) as Mountain;
const TODAY = new Date("2026-09-29T09:00:00Z");
const DATES = ["2026-10-03", "2026-10-04"];

const summary = (over: Partial<DaySummary> = {}): DaySummary => ({
  date: "2026-10-03",
  maxPrecipProb: 10,
  precipMm: 0,
  maxGustMph: 15,
  maxWindMph: 10,
  minFeelsLikeC: 8,
  maxTempC: 14,
  minTempC: 9,
  minVisibilityM: 30000,
  maxThunderProb: null,
  condition: "clear",
  ...over,
});

function day(date: string, over: Partial<Slot> & { condition?: Condition } = {}): DayForecast {
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

function destination(mountain: Mountain, days: DayForecast[], minutes = mountain.brightonDriveMinutes): WeekendDestination {
  return {
    mountain,
    forecast: { source: "openmeteo", issuedAt: null, modelElevationM: null, days },
    secondOpinion: null,
    drive: { minutes, km: 100, method: "estimate" },
  };
}

describe("weatherScore", () => {
  it("rates a calm, dry, sunny day highly", () => {
    expect(weatherScore(summary(), byId("yr-wyddfa"))).toBeGreaterThanOrEqual(95);
  });

  it("punishes rain and wind", () => {
    const wet = weatherScore(summary({ maxPrecipProb: 90, precipMm: 6, condition: "heavy-rain" }), byId("yr-wyddfa"));
    const windy = weatherScore(summary({ maxGustMph: 45 }), byId("yr-wyddfa"));
    expect(wet).toBeLessThan(40);
    expect(windy).toBeLessThan(80);
  });

  it("treats wind as worse on exposed routes", () => {
    const gusty = summary({ maxGustMph: 40 });
    expect(weatherScore(gusty, byId("tryfan"))).toBeLessThan(weatherScore(gusty, byId("ditchling-beacon")));
  });
});

describe("safetyVetoes", () => {
  it("vetoes 50 mph gusts on exposed summits but not in the lowlands", () => {
    const gusty = summary({ maxGustMph: 52 });
    expect(safetyVetoes(gusty, byId("scafell-pike"))).toHaveLength(1);
    expect(safetyVetoes(gusty, byId("ditchling-beacon"))).toHaveLength(0);
  });

  it("vetoes thunderstorms", () => {
    expect(safetyVetoes(summary({ condition: "thunder" }), byId("pen-y-fan"))).toContain(
      "Thunderstorms on exposed ground",
    );
  });
});

describe("travelScore", () => {
  it("falls with drive time", () => {
    expect(travelScore(30)).toBe(100);
    expect(travelScore(300)).toBeLessThan(travelScore(120));
    expect(travelScore(900)).toBe(10);
  });
});

describe("recommend", () => {
  it("prefers the big mountain when the weather is equally good everywhere", () => {
    const scores = [byId("ditchling-beacon"), byId("yr-wyddfa")].map((m) =>
      scoreDestination(destination(m, DATES.map((d) => day(d))), DEFAULT_PREFERENCES, TODAY),
    );
    const { pick, runnerUp } = recommend(scores);
    expect(pick?.score.destination.mountain.id).toBe("yr-wyddfa");
    expect(runnerUp?.why).toMatch(/overnight/);
  });

  it("never picks a vetoed day", () => {
    const stormy = DATES.map((d) => day(d, { gustMph: 65, condition: "thunder" }));
    const calm = DATES.map((d) => day(d, { precipProb: 60, precipMm: 0.4, condition: "drizzle" }));
    const scores = [
      scoreDestination(destination(byId("yr-wyddfa"), stormy), DEFAULT_PREFERENCES, TODAY),
      scoreDestination(destination(byId("seven-sisters"), calm), DEFAULT_PREFERENCES, TODAY),
    ];
    expect(recommend(scores).pick?.score.destination.mountain.id).toBe("seven-sisters");
  });

  it("respects the maximum drive time", () => {
    const prefs = { ...DEFAULT_PREFERENCES, maxDriveMinutes: 90 };
    const scores = [byId("ditchling-beacon"), byId("cairn-gorm")].map((m) =>
      scoreDestination(destination(m, DATES.map((d) => day(d))), prefs, TODAY),
    );
    expect(recommend(scores).pick?.score.destination.mountain.id).toBe("ditchling-beacon");
  });

  it("returns no pick when everything is unsafe", () => {
    const stormy = DATES.map((d) => day(d, { condition: "thunder" }));
    const scores = [scoreDestination(destination(byId("tryfan"), stormy), DEFAULT_PREFERENCES, TODAY)];
    expect(recommend(scores).pick).toBeNull();
  });
});
