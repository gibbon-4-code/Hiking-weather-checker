import { describe, expect, it } from "vitest";
import { fingerprint } from "@/lib/providers/routing";

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
