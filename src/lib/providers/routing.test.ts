import { describe, expect, it } from "vitest";
import { BRIGHTON, MOUNTAINS } from "@/data/mountains";
import { estimateDrive, fingerprint } from "@/lib/providers/routing";

describe("fingerprint", () => {
  it("is stable for the same line-up", () => {
    expect(fingerprint("pen-y-fan|scafell-pike")).toBe(fingerprint("pen-y-fan|scafell-pike"));
  });

  it("changes when a mountain is added, removed or reordered", () => {
    const base = fingerprint("pen-y-fan|scafell-pike");
    expect(fingerprint("pen-y-fan|scafell-pike|ben-nevis")).not.toBe(base);
    expect(fingerprint("pen-y-fan")).not.toBe(base);
    expect(fingerprint("scafell-pike|pen-y-fan")).not.toBe(base);
  });
});

describe("estimateDrive", () => {
  const find = (id: string) => MOUNTAINS.find((m) => m.id === id)!;
  const kendal = { label: "Kendal", postcode: null, lat: 54.328, lon: -2.746 };

  it("keeps short trips short", () => {
    expect(estimateDrive(BRIGHTON, find("ditchling-beacon")).minutes).toBeLessThan(35);
  });

  it("doesn't pretend Lake District roads are motorways", () => {
    // The real drive from Kendal to Wasdale Head is well over an hour and a half.
    expect(estimateDrive(kendal, find("scafell-pike")).minutes).toBeGreaterThan(70);
  });

  it("gives long trips motorway speeds", () => {
    const minutes = estimateDrive(BRIGHTON, find("yr-wyddfa")).minutes;
    expect(minutes).toBeGreaterThan(5 * 60);
    expect(minutes).toBeLessThan(6.5 * 60);
  });
});
