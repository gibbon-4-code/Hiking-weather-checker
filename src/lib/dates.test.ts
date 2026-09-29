import { describe, expect, it } from "vitest";
import { formatDuration, upcomingWeekend } from "@/lib/dates";

describe("upcomingWeekend", () => {
  it("looks ahead to Saturday from midweek", () => {
    expect(upcomingWeekend(new Date("2026-09-29T09:00:00Z"))).toEqual({
      dates: ["2026-10-03", "2026-10-04"],
      daysAway: 4,
    });
  });

  it("uses today on a Saturday", () => {
    expect(upcomingWeekend(new Date("2026-10-03T08:00:00Z")).dates[0]).toBe("2026-10-03");
  });

  it("moves to next weekend on a Sunday", () => {
    expect(upcomingWeekend(new Date("2026-10-04T08:00:00Z")).dates[0]).toBe("2026-10-10");
  });

  it("uses UK time, not UTC, around midnight", () => {
    // 23:30 UTC on Friday is already 00:30 Saturday in BST.
    expect(upcomingWeekend(new Date("2026-10-02T23:30:00Z")).daysAway).toBe(0);
  });
});

describe("formatDuration", () => {
  it("formats minutes as hours and minutes", () => {
    expect(formatDuration(45)).toBe("45 min");
    expect(formatDuration(120)).toBe("2h");
    expect(formatDuration(215)).toBe("3h 35m");
  });
});
