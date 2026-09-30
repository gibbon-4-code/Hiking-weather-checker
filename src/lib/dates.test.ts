import { describe, expect, it } from "vitest";
import { daysBetween, defaultHikeDate, formatDuration, isPlannableDate, planWindow } from "@/lib/dates";

describe("defaultHikeDate", () => {
  it("looks ahead to Saturday from midweek", () => {
    expect(defaultHikeDate(new Date("2026-09-29T09:00:00Z"))).toBe("2026-10-03");
  });

  it("uses today on a Saturday", () => {
    expect(defaultHikeDate(new Date("2026-10-03T08:00:00Z"))).toBe("2026-10-03");
  });

  it("moves to next Saturday on a Sunday", () => {
    expect(defaultHikeDate(new Date("2026-10-04T08:00:00Z"))).toBe("2026-10-10");
  });

  it("uses UK time, not UTC, around midnight", () => {
    // 23:30 UTC on Friday is already 00:30 Saturday in BST.
    expect(defaultHikeDate(new Date("2026-10-02T23:30:00Z"))).toBe("2026-10-03");
  });
});

describe("planWindow", () => {
  it("runs from today to 13 days ahead", () => {
    expect(planWindow(new Date("2026-09-30T09:00:00Z"))).toEqual({ first: "2026-09-30", last: "2026-10-13" });
  });
});

describe("isPlannableDate", () => {
  const now = new Date("2026-09-30T09:00:00Z");

  it("accepts today and the last day of the window", () => {
    expect(isPlannableDate("2026-09-30", now)).toBe(true);
    expect(isPlannableDate("2026-10-13", now)).toBe(true);
  });

  it("rejects the past and anything beyond two weeks", () => {
    expect(isPlannableDate("2026-09-29", now)).toBe(false);
    expect(isPlannableDate("2026-10-14", now)).toBe(false);
  });

  it("rejects things that aren't real dates", () => {
    expect(isPlannableDate("2026-02-31", new Date("2026-02-20T09:00:00Z"))).toBe(false);
    expect(isPlannableDate("next saturday", now)).toBe(false);
    expect(isPlannableDate("", now)).toBe(false);
  });
});

describe("daysBetween", () => {
  it("counts whole days, including across the clocks changing", () => {
    expect(daysBetween("2026-10-20", "2026-10-27")).toBe(7);
  });
});

describe("formatDuration", () => {
  it("formats minutes as hours and minutes", () => {
    expect(formatDuration(45)).toBe("45 min");
    expect(formatDuration(120)).toBe("2h");
    expect(formatDuration(215)).toBe("3h 35m");
  });
});
