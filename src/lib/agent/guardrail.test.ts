import { describe, expect, it } from "vitest";
import { BRIGHTON, MOUNTAINS } from "@/data/mountains";
import { checkAnswer, type ScoutAnswer } from "@/lib/agent/guardrail";
import { estimateDrive } from "@/lib/providers/routing";
import { DEFAULT_PREFERENCES } from "@/lib/scoring";
import type { DayForecast, Mountain, PlanResponse, Slot } from "@/lib/types";

const byId = (id: string) => MOUNTAINS.find((m) => m.id === id) as Mountain;
const TODAY = new Date("2026-09-29T09:00:00Z");
const SATURDAY = "2026-10-03";
const WEEKEND = [SATURDAY, "2026-10-04"];

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

/** A plan for Saturday where Tryfan, an exposed ridge, has 60 mph gusts and everywhere else is calm. */
function plan(): PlanResponse {
  return {
    generatedAt: TODAY.toISOString(),
    home: BRIGHTON,
    day: { date: SATURDAY, daysAway: 4 },
    destinations: ["ditchling-beacon", "tryfan"].map((id) => {
      const mountain = byId(id);
      return {
        mountain,
        forecast: {
          source: "openmeteo",
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

const answer = (over: Partial<ScoutAnswer> = {}): ScoutAnswer => ({
  verdict: "go",
  mountainId: "ditchling-beacon",
  date: SATURDAY,
  headline: "Go to Ditchling Beacon on Saturday.",
  reasons: ["Light winds"],
  confidence: "high",
  ...over,
});

const check = (a: ScoutAnswer, prefs = DEFAULT_PREFERENCES) => checkAnswer(a, plan(), WEEKEND, TODAY, prefs);

describe("checkAnswer", () => {
  it("lets a safe pick through unchanged", () => {
    const result = check(answer());
    expect(result.overruled).toBeNull();
    expect(result.answer).toEqual(answer());
  });

  it("lets a skip through without checking anything", () => {
    const skip = answer({ verdict: "skip", mountainId: null, date: null });
    expect(check(skip).overruled).toBeNull();
  });

  it("overrules a pick that fails a safety rule", () => {
    const result = check(answer({ mountainId: "tryfan" }));
    expect(result.answer.verdict).toBe("skip");
    expect(result.answer.mountainId).toBeNull();
    expect(result.overruled).toMatch(/Tryfan.* is unsafe.*gusts 60 mph/);
  });

  it("checks a wait verdict too, so it can't point at an unsafe hill", () => {
    expect(check(answer({ verdict: "wait", mountainId: "tryfan" })).answer.verdict).toBe("skip");
  });

  it("overrules a day that isn't this weekend", () => {
    expect(check(answer({ date: "2026-10-10" })).overruled).toMatch(/isn't this weekend/);
  });

  it("overrules a hill that doesn't exist", () => {
    expect(check(answer({ mountainId: "sheltered-dyke" })).overruled).toMatch(/no hill with the id/);
  });

  it("overrules a go without a hill", () => {
    expect(check(answer({ mountainId: null })).overruled).toMatch(/without a hill and a day/);
  });

  it("overrules a hill outside the search", () => {
    const nearOnly = { ...DEFAULT_PREFERENCES, maxDriveMinutes: 10 };
    expect(check(answer(), nearOnly).overruled).toMatch(/outside the search/);
  });
});
