import { describe, expect, it } from "vitest";
import { checkAnswer, type ScoutAnswer } from "@/lib/agent/guardrail";
import { answer, plan, TODAY, WEEKEND } from "@/lib/agent/test-fixtures";
import { DEFAULT_PREFERENCES } from "@/lib/scoring";

const check = (a: ScoutAnswer, prefs = DEFAULT_PREFERENCES) => checkAnswer(a, plan(), WEEKEND, TODAY, prefs);
const checkOnDemoData = (a: ScoutAnswer) => checkAnswer(a, plan("demo"), WEEKEND, TODAY);

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

  it("turns a go on demo data into a wait", () => {
    const result = checkOnDemoData(answer());
    expect(result.answer.verdict).toBe("wait");
    expect(result.answer.confidence).toBe("low");
    expect(result.answer.mountainId).toBe("ditchling-beacon");
    expect(result.answer.reasons.at(-1)).toMatch(/demo data/);
    expect(result.downgraded).toBe("the forecast is demo data");
    expect(result.overruled).toBeNull();
  });

  it("leaves a wait on demo data alone", () => {
    const result = checkOnDemoData(answer({ verdict: "wait" }));
    expect(result.answer).toEqual(answer({ verdict: "wait" }));
    expect(result.downgraded).toBeNull();
  });

  it("still overrules an unsafe pick on demo data", () => {
    expect(checkOnDemoData(answer({ mountainId: "tryfan" })).answer.verdict).toBe("skip");
  });
});
