import "server-only";
import { BRIGHTON, MOUNTAINS } from "@/data/mountains";
import { daysBetween, planWindow } from "@/lib/dates";
import { env } from "@/lib/env";
import { demoForecast } from "@/lib/providers/demo";
import { fetchMetOffice } from "@/lib/providers/metoffice";
import { fetchOpenMeteo } from "@/lib/providers/openmeteo";
import { estimateDrive, getDrives } from "@/lib/providers/routing";
import { coversWalkingDay } from "@/lib/providers/shared";
import type { DestinationForecast, Drive, Home, WeekendResponse } from "@/lib/types";

const fullyCovers = (f: DestinationForecast) => f.days.every(coversWalkingDay);

/** The Met Office site-specific forecast runs about a week ahead. */
export const MET_OFFICE_DAYS_AHEAD = 6;

/**
 * Every destination is ranked on Open-Meteo: one batched request covers the whole list for the full
 * two weeks, so scores are comparable. The Met Office charges one call per mountain, so it is only
 * asked for a second opinion when someone opens a mountain's details (see `buildSecondOpinion`).
 */
export async function buildWeekend(date: string, home: Home = BRIGHTON): Promise<WeekendResponse> {
  const dates = [date];
  const daysAway = daysBetween(planWindow().first, date);
  const notices: string[] = [];

  const [openMeteo, drives] = await Promise.all([loadOpenMeteo(dates, notices), loadDrives(home, notices)]);

  const destinations = MOUNTAINS.map((mountain, i) => {
    const om = openMeteo?.[i] ?? null;
    const forecast: DestinationForecast = om && fullyCovers(om) ? om : demoForecast(mountain, dates);
    return { mountain, forecast, drive: drives[i] };
  });

  if (destinations.some((d) => d.forecast.source === "demo")) {
    notices.push("Some or all forecasts are demo data because no live weather source could cover this day.");
  }

  return {
    generatedAt: new Date().toISOString(),
    home,
    day: { date, daysAway },
    destinations,
    notices,
    keys: { metOffice: Boolean(env.metOfficeKey), routing: Boolean(env.orsKey) },
    secondOpinion: Boolean(env.metOfficeKey) && !env.forceDemoData && daysAway <= MET_OFFICE_DAYS_AHEAD,
  };
}

/** The Met Office forecast for one mountain, or null when there's no key or it can't cover the day. */
export async function buildSecondOpinion(mountainId: string, date: string): Promise<DestinationForecast | null> {
  const mountain = MOUNTAINS.find((m) => m.id === mountainId);
  if (!mountain) throw new UnknownMountainError(mountainId);
  if (!env.metOfficeKey || env.forceDemoData) return null;
  if (daysBetween(planWindow().first, date) > MET_OFFICE_DAYS_AHEAD) return null;
  const forecast = await fetchMetOffice(mountain, [date], env.metOfficeKey);
  return fullyCovers(forecast) ? forecast : null;
}

export class UnknownMountainError extends Error {}

async function loadOpenMeteo(dates: string[], notices: string[]) {
  if (env.forceDemoData) return null;
  try {
    return await fetchOpenMeteo(MOUNTAINS, dates);
  } catch (err) {
    console.error("Open-Meteo failure", err);
    notices.push("Open-Meteo is unavailable right now.");
    return null;
  }
}

async function loadDrives(home: Home, notices: string[]): Promise<Drive[]> {
  const estimates = MOUNTAINS.map((m) => estimateDrive(home, m));
  if (!env.orsKey) return estimates;
  try {
    return await getDrives(home, MOUNTAINS, env.orsKey);
  } catch (err) {
    console.error("OpenRouteService failure", err);
    notices.push("Live drive times are unavailable, so these are estimates.");
    return estimates;
  }
}
