import { describe, expect, it } from "vitest";
import { MOUNTAINS } from "@/data/mountains";
import { haversineKm } from "@/lib/providers/routing";

/** Roughly Great Britain and its islands, including Shetland. */
const inBritain = ({ lat, lon }: { lat: number; lon: number }) => lat > 49.8 && lat < 60.9 && lon > -8.7 && lon < 1.8;

describe("mountain list", () => {
  it("has unique ids written in kebab-case", () => {
    const ids = MOUNTAINS.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it.each(MOUNTAINS.map((m) => [m.id, m] as const))("%s is complete and plausible", (_, m) => {
    expect(inBritain(m.summit), "summit is outside Great Britain").toBe(true);
    expect(inBritain(m.trailhead), "trailhead is outside Great Britain").toBe(true);
    expect(m.summit.elevationM).toBeGreaterThan(0);
    expect(m.summit.elevationM).toBeLessThan(1350);
    expect(haversineKm(m.summit, m.trailhead), "trailhead is too far from the summit").toBeLessThan(12);
    expect(m.quality).toBeGreaterThanOrEqual(1);
    expect(m.quality).toBeLessThanOrEqual(5);
    expect(Number.isInteger(m.quality)).toBe(true);
    for (const text of [m.name, m.area, m.trailhead.name, m.route, m.stayNear]) expect(text.trim()).not.toBe("");
    expect(m.walkingHours).toMatch(/hrs? · \d+ km$/);
  });
});
