import type { Mountain } from "@/lib/types";

/** How long a walk someone is after, so a short stroll doesn't come with a five-hour round trip. */
export type WalkLength = "short" | "half" | "full";

export const WALK_OPTIONS: { label: string; value: WalkLength | null }[] = [
  { label: "Up to 3 hrs", value: "short" },
  { label: "3–5 hrs", value: "half" },
  { label: "5 hrs +", value: "full" },
  { label: "Any", value: null },
];

export const isWalkLength = (v: unknown): v is WalkLength => v === "short" || v === "half" || v === "full";

/** The longest the walk is expected to take, read from text like "3–4 hrs · 10 km". */
export function walkHours(mountain: Pick<Mountain, "walkingHours">) {
  const match = mountain.walkingHours.match(/^(\d+)(?:–(\d+))? hrs?/);
  if (!match) throw new Error(`Can't read walking time "${mountain.walkingHours}"`);
  return Number(match[2] ?? match[1]);
}

/** "3–4 hrs · 13 km" split into the time and the distance. */
export function walkParts(mountain: Pick<Mountain, "walkingHours">) {
  const [time, distance] = mountain.walkingHours.split(" · ");
  return { time, distance: distance ?? null };
}

export function matchesWalk(mountain: Pick<Mountain, "walkingHours">, walk: WalkLength | null) {
  if (walk === null) return true;
  const hours = walkHours(mountain);
  if (walk === "short") return hours <= 3;
  if (walk === "half") return hours > 3 && hours <= 5;
  return hours > 5;
}

export function walkLabel(walk: WalkLength | null) {
  const option = WALK_OPTIONS.find((o) => o.value === walk);
  return walk === null ? "Any walk" : `Walk ${option?.label.replace("Up to", "up to")}`;
}
