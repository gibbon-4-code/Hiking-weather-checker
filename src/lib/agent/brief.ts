import { BRIGHTON } from "@/data/mountains";
import { addDays, defaultHikeDate, isPlannableDate } from "@/lib/dates";
import { DEFAULT_PREFERENCES, type Preferences } from "@/lib/scoring";
import { driveLimitLabel } from "@/lib/search";
import type { Home } from "@/lib/types";
import type { WalkLength } from "@/lib/walks";

/**
 * What the person asked the Scout: where they're setting off from, which days it may recommend, and
 * their filters. It shapes the prompt, the tools and the guardrail, so all three follow the search.
 */
export interface ScoutBrief {
  /** "weekend": the original question about this weekend from Brighton. "search": a search someone ran. */
  kind: "weekend" | "search";
  home: Home;
  prefs: Preferences;
  /** The days the Scout may recommend, the person's own choice first. */
  days: string[];
}

/** The coming weekend, from "today". */
export function weekend(now: Date) {
  const saturday = defaultHikeDate(now);
  return { saturday, sunday: addDays(saturday, 1) };
}

/** The original Scout question: is this weekend worth it, from Brighton, with no filters? */
export function weekendBrief(now: Date): ScoutBrief {
  const { saturday, sunday } = weekend(now);
  return { kind: "weekend", home: BRIGHTON, prefs: DEFAULT_PREFERENCES, days: [saturday, sunday] };
}

/** A search someone ran: their starting point, filters and day, plus the day either side to compare. */
export function searchBrief(home: Home, prefs: Preferences, date: string, now: Date): ScoutBrief {
  const days = [date, addDays(date, -1), addDays(date, 1)].filter((d) => isPlannableDate(d, now));
  return { kind: "search", home, prefs, days };
}

const WALK_WORDS: Record<WalkLength, string> = {
  short: "a walk of up to 3 hours",
  half: "a walk of 3 to 5 hours",
  full: "a walk of 5 hours or more",
};

/** The person's filters in words, e.g. "a drive of up to 2 hrs and a walk of 3 to 5 hours". Empty with none. */
export function describeFilters(prefs: Preferences): string {
  return [
    prefs.maxDriveMinutes !== null && `a drive of ${driveLimitLabel(prefs.maxDriveMinutes).toLowerCase()}`,
    prefs.walk !== null && WALK_WORDS[prefs.walk],
  ]
    .filter(Boolean)
    .join(" and ");
}
