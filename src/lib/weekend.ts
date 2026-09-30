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

/** The Met Office site-specific forecast runs about a week ahead; past that, Open-Meteo covers alone. */
const MET_OFFICE_DAYS_AHEAD = 6;

export async function buildWeekend(date: string, home: Home = BRIGHTON): Promise<WeekendResponse> {
  const dates = [date];
  const daysAway = daysBetween(planWindow().first, date);
  const notices: string[] = [];

  const [metOffice, openMeteo, drives] = await Promise.all([
    daysAway <= MET_OFFICE_DAYS_AHEAD ? loadMetOffice(dates, notices) : null,
    loadOpenMeteo(dates, notices),
    loadDrives(home, notices),
  ]);

  const destinations = MOUNTAINS.map((mountain, i) => {
    const met = metOffice?.[i] ?? null;
    const om = openMeteo?.[i] ?? null;
    let forecast: DestinationForecast;
    if (met && fullyCovers(met)) forecast = met;
    else if (om && fullyCovers(om)) forecast = om;
    else forecast = demoForecast(mountain, dates);
    const secondOpinion = forecast.source === "metoffice" && om && fullyCovers(om) ? om : null;
    return { mountain, forecast, secondOpinion, drive: drives[i] };
  });

  const sources = new Set(destinations.map((d) => d.forecast.source));
  if (sources.has("demo")) {
    notices.push("Some or all forecasts are demo data because no live weather source could cover this day.");
  } else if (env.metOfficeKey && sources.has("openmeteo")) {
    notices.push("The Met Office forecast doesn't reach this day yet, so Open-Meteo is filling the gap.");
  }

  return {
    generatedAt: new Date().toISOString(),
    home,
    day: { date, daysAway },
    destinations,
    notices,
    keys: { metOffice: Boolean(env.metOfficeKey), routing: Boolean(env.orsKey) },
  };
}

async function loadMetOffice(dates: string[], notices: string[]) {
  if (!env.metOfficeKey || env.forceDemoData) return null;
  const key = env.metOfficeKey;
  const results = await Promise.allSettled(MOUNTAINS.map((m) => fetchMetOffice(m, dates, key)));
  const failed = results.filter((r) => r.status === "rejected");
  if (failed.length) {
    console.error("Met Office failures", failed.map((f) => String((f as PromiseRejectedResult).reason)));
    notices.push(`The Met Office didn't respond for ${failed.length} of ${MOUNTAINS.length} destinations; using Open-Meteo for those.`);
  }
  return results.map((r) => (r.status === "fulfilled" ? r.value : null));
}

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
