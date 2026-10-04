import { describe, expect, it } from "vitest";
import { driveLimitLabel, parseSearch, searchQuery } from "@/lib/search";

// A Wednesday, so the default hike date is Saturday 10 October.
const NOW = new Date("2026-10-07T09:00:00Z");

describe("parseSearch", () => {
  it("needs somewhere to start from", () => {
    expect(parseSearch({}, NOW)).toBeNull();
    expect(parseSearch({ from: "  " }, NOW)).toBeNull();
  });

  it("reads a full search", () => {
    expect(parseSearch({ from: "Leeds", date: "2026-10-11", drive: "180", walk: "short" }, NOW)).toEqual({
      from: "Leeds",
      date: "2026-10-11",
      maxDriveMinutes: 180,
      walk: "short",
    });
  });

  it("falls back to the coming Saturday, no drive limit and any walk", () => {
    expect(parseSearch({ from: "Leeds", date: "2027-01-01", drive: "lots", walk: "marathon" }, NOW)).toEqual({
      from: "Leeds",
      date: "2026-10-10",
      maxDriveMinutes: null,
      walk: null,
    });
  });

  it("round-trips through the query string", () => {
    const search = { from: "Bishop's Stortford", date: "2026-10-10", maxDriveMinutes: 120, walk: "half" as const };
    const params = Object.fromEntries(new URLSearchParams(searchQuery(search)));
    expect(parseSearch(params, NOW)).toEqual(search);
    expect(searchQuery({ ...search, maxDriveMinutes: null })).not.toContain("drive");
    expect(searchQuery({ ...search, walk: null })).not.toContain("walk");
  });
});

describe("driveLimitLabel", () => {
  it("reads naturally", () => {
    expect(driveLimitLabel(60)).toBe("Up to 1 hr");
    expect(driveLimitLabel(180)).toBe("Up to 3 hrs");
    expect(driveLimitLabel(null)).toBe("Any drive");
  });
});
