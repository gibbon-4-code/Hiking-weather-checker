const LONDON = "Europe/London";

const partsFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: LONDON,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  hourCycle: "h23",
  weekday: "short",
});

export function londonParts(iso: string | Date) {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  const p = Object.fromEntries(partsFormatter.formatToParts(d).map((x) => [x.type, x.value]));
  return {
    date: `${p.year}-${p.month}-${p.day}`,
    hour: Number(p.hour),
    weekday: p.weekday as string,
  };
}

export function addDays(date: string, days: number) {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function daysBetween(from: string, to: string) {
  return Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86400000);
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Today plus 13 more days: two weeks, well inside Open-Meteo's 16-day forecast. */
export const PLAN_AHEAD_DAYS = 13;

/** The first and last day you can plan a hike for, in UK time. */
export function planWindow(now: Date = new Date()) {
  const first = londonParts(now).date;
  return { first, last: addDays(first, PLAN_AHEAD_DAYS) };
}

/**
 * The day picked when you haven't chosen one: the coming Saturday, or today if it is Saturday.
 * On a Sunday the day is mostly gone, so it looks ahead to next Saturday.
 */
export function defaultHikeDate(now: Date = new Date()) {
  const today = londonParts(now);
  const dow = WEEKDAYS.indexOf(today.weekday);
  return addDays(today.date, dow === 0 ? 6 : 6 - dow);
}

/** A real calendar date, written YYYY-MM-DD, that falls inside the planning window. */
export function isPlannableDate(date: string, now: Date = new Date()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T12:00:00Z`))) return false;
  if (new Date(`${date}T12:00:00Z`).toISOString().slice(0, 10) !== date) return false;
  const { first, last } = planWindow(now);
  return date >= first && date <= last;
}

export function formatDayName(date: string, style: "short" | "long" = "long") {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString("en-GB", {
    weekday: style,
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

export function formatClock(iso: string) {
  return new Date(iso).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: LONDON,
  });
}

export function formatDuration(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h}h` : `${h}h ${m.toString().padStart(2, "0")}m`;
}
