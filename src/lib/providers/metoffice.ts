import type { DestinationForecast, Mountain, Slot } from "@/lib/types";
import { metOfficeCondition } from "./conditions";
import { groupIntoDays } from "./shared";

const BASE = "https://data.hub.api.metoffice.gov.uk/sitespecific/v0/point/three-hourly";
const MS_TO_MPH = 2.23694;
/** Standard atmosphere lapse rate: temperature falls roughly 0.65 °C per 100 m of height. */
const LAPSE_C_PER_M = 0.0065;

interface MetOfficeStep {
  time: string;
  maxScreenAirTemp?: number;
  minScreenAirTemp?: number;
  feelsLikeTemp?: number;
  windSpeed10m?: number;
  windGustSpeed10m?: number;
  max10mWindGust?: number;
  visibility?: number;
  probOfPrecipitation?: number;
  totalPrecipAmount?: number;
  probOfThunder?: number;
  significantWeatherCode?: number;
}

export interface MetOfficeResponse {
  features: {
    geometry: { coordinates: number[] };
    properties: { modelRunDate?: string; timeSeries: MetOfficeStep[] };
  }[];
}

export function normaliseMetOffice(
  body: MetOfficeResponse,
  mountain: Mountain,
  dates: string[],
): DestinationForecast {
  const feature = body.features?.[0];
  if (!feature?.properties?.timeSeries?.length) throw new Error("Met Office returned no time series");

  const modelElevationM = feature.geometry?.coordinates?.[2] ?? null;
  const tempShift =
    modelElevationM === null ? 0 : -(mountain.summit.elevationM - modelElevationM) * LAPSE_C_PER_M;

  const slots: Slot[] = feature.properties.timeSeries.map((s) => {
    const max = s.maxScreenAirTemp ?? s.minScreenAirTemp ?? 0;
    const min = s.minScreenAirTemp ?? max;
    const gust = Math.max(s.windGustSpeed10m ?? 0, s.max10mWindGust ?? 0);
    return {
      time: s.time,
      hours: 3,
      tempC: round1((max + min) / 2 + tempShift),
      feelsLikeC: round1((s.feelsLikeTemp ?? min) + tempShift),
      windMph: Math.round((s.windSpeed10m ?? 0) * MS_TO_MPH),
      gustMph: Math.round(gust * MS_TO_MPH),
      precipProb: s.probOfPrecipitation ?? 0,
      precipMm: s.totalPrecipAmount ?? 0,
      visibilityM: s.visibility ?? null,
      thunderProb: s.probOfThunder ?? null,
      condition: metOfficeCondition(s.significantWeatherCode ?? 7),
    };
  });

  return {
    source: "metoffice",
    issuedAt: feature.properties.modelRunDate ?? null,
    modelElevationM,
    days: groupIntoDays(slots, dates, {}),
  };
}

export async function fetchMetOffice(
  mountain: Mountain,
  dates: string[],
  apiKey: string,
): Promise<DestinationForecast> {
  const url = `${BASE}?latitude=${mountain.summit.lat}&longitude=${mountain.summit.lon}&excludeParameterMetadata=true`;
  const res = await fetch(url, {
    headers: { apikey: apiKey, accept: "application/json" },
    next: { revalidate: 3600 },
  });
  if (!res.ok) throw new Error(`Met Office ${res.status} for ${mountain.id}`);
  return normaliseMetOffice((await res.json()) as MetOfficeResponse, mountain, dates);
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}
