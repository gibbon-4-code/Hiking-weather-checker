import { describe, expect, it } from "vitest";
import { MOUNTAINS } from "@/data/mountains";
import { matchesWalk, walkHours, walkLabel } from "@/lib/walks";

const walk = (walkingHours: string) => ({ walkingHours });

describe("walkHours", () => {
  it("takes the longer end of a range", () => {
    expect(walkHours(walk("1 hr · 3 km"))).toBe(1);
    expect(walkHours(walk("3 hrs · 9 km"))).toBe(3);
    expect(walkHours(walk("3–4 hrs · 10 km"))).toBe(4);
    expect(walkHours(walk("10–11 hrs · 25 km"))).toBe(11);
  });

  it("can read every hill on the list", () => {
    for (const m of MOUNTAINS) expect(walkHours(m), m.id).toBeGreaterThan(0);
  });
});

describe("matchesWalk", () => {
  it("sorts walks into short, half-day and full-day", () => {
    expect(matchesWalk(walk("2–3 hrs · 7 km"), "short")).toBe(true);
    expect(matchesWalk(walk("3–4 hrs · 10 km"), "short")).toBe(false);
    expect(matchesWalk(walk("3–4 hrs · 10 km"), "half")).toBe(true);
    expect(matchesWalk(walk("5 hrs · 14 km"), "half")).toBe(true);
    expect(matchesWalk(walk("5–6 hrs · 15 km"), "full")).toBe(true);
    expect(matchesWalk(walk("5–6 hrs · 15 km"), null)).toBe(true);
  });
});

describe("walkLabel", () => {
  it("reads naturally", () => {
    expect(walkLabel("short")).toBe("Walk up to 3 hrs");
    expect(walkLabel("half")).toBe("Walk 3–5 hrs");
    expect(walkLabel(null)).toBe("Any walk");
  });
});
