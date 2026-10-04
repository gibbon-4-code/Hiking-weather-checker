import { defaultHikeDate, isPlannableDate } from "@/lib/dates";
import { isWalkLength, type WalkLength } from "@/lib/walks";

/** A search lives in the URL (`/results?from=Leeds&date=2026-10-10&drive=180&walk=short`) so it can be shared. */
export interface Search {
  from: string;
  date: string;
  /** null means no limit. */
  maxDriveMinutes: number | null;
  /** null means any length of walk. */
  walk: WalkLength | null;
}

export const DRIVE_OPTIONS: { label: string; minutes: number | null }[] = [
  { label: "1 hr", minutes: 60 },
  { label: "2 hrs", minutes: 120 },
  { label: "3 hrs", minutes: 180 },
  { label: "4 hrs", minutes: 240 },
  { label: "Any", minutes: null },
];

type Params = Record<string, string | string[] | undefined>;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** Reads a search from URL params. Returns null when there's no starting point to search from. */
export function parseSearch(params: Params, now: Date = new Date()): Search | null {
  const from = first(params.from)?.trim();
  if (!from) return null;
  const date = first(params.date);
  const drive = Number(first(params.drive));
  const walk = first(params.walk);
  return {
    from,
    date: date && isPlannableDate(date, now) ? date : defaultHikeDate(now),
    maxDriveMinutes: Number.isFinite(drive) && drive > 0 ? drive : null,
    walk: isWalkLength(walk) ? walk : null,
  };
}

export function searchQuery(search: Search) {
  const params = new URLSearchParams({ from: search.from, date: search.date });
  if (search.maxDriveMinutes !== null) params.set("drive", String(search.maxDriveMinutes));
  if (search.walk !== null) params.set("walk", search.walk);
  return params.toString();
}

export function driveLimitLabel(maxDriveMinutes: number | null) {
  if (maxDriveMinutes === null) return "Any drive";
  const h = maxDriveMinutes / 60;
  return `Up to ${h} ${h === 1 ? "hr" : "hrs"}`;
}
