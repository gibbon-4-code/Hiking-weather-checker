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

function addDays(date: string, days: number) {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * The weekend to plan for, in UK time. Monday to Saturday gives the coming (or current)
 * Saturday and Sunday; on a Sunday the day is mostly gone, so it looks ahead to next weekend.
 */
export function upcomingWeekend(now: Date = new Date()) {
  const today = londonParts(now);
  const dow = WEEKDAYS.indexOf(today.weekday);
  const daysToSaturday = dow === 0 ? 6 : 6 - dow;
  const saturday = addDays(today.date, daysToSaturday);
  return {
    dates: [saturday, addDays(saturday, 1)] as [string, string],
    daysAway: daysToSaturday,
  };
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
