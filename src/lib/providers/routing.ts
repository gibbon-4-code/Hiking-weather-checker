import { unstable_cache } from "next/cache";
import type { Drive, Home, Mountain } from "@/lib/types";

const ORS_MATRIX = "https://api.openrouteservice.org/v2/matrix/driving-car";

export function haversineKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const R = 6371;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const x =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

const isBrighton = (home: Home) => haversineKm(home, { lat: 50.8263, lon: -0.1408 }) < 8;

/** Straight-line distance scaled to typical UK road distance and average speeds. */
export function estimateDrive(home: Home, mountain: Mountain): Drive {
  const km = haversineKm(home, mountain.trailhead) * 1.3;
  if (isBrighton(home)) return { minutes: mountain.brightonDriveMinutes, km: Math.round(km), method: "estimate" };
  const avgKph = km < 40 ? 50 : 85;
  return { minutes: Math.round((km / avgKph) * 60 + 10), km: Math.round(km), method: "estimate" };
}

async function orsMatrix(home: Home, mountains: Mountain[], apiKey: string): Promise<Drive[]> {
  const res = await fetch(ORS_MATRIX, {
    method: "POST",
    headers: { Authorization: apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      locations: [[home.lon, home.lat], ...mountains.map((m) => [m.trailhead.lon, m.trailhead.lat])],
      sources: [0],
      destinations: mountains.map((_, i) => i + 1),
      metrics: ["duration", "distance"],
      units: "km",
    }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`OpenRouteService ${res.status}`);
  const body = (await res.json()) as { durations: (number | null)[][]; distances: (number | null)[][] };
  return mountains.map((m, i) => {
    const seconds = body.durations[0][i];
    const km = body.distances[0][i];
    if (seconds == null || km == null) return estimateDrive(home, m);
    return { minutes: Math.round(seconds / 60), km: Math.round(km), method: "openrouteservice" };
  });
}

/**
 * Road times barely change, so one call per home location per day is plenty. The cache key includes
 * the trailheads too: the saved answer is a list in mountain order, and Vercel keeps cached data
 * across deploys, so adding a mountain must not reuse a list built for the old line-up.
 */
export function getDrives(home: Home, mountains: Mountain[], apiKey: string) {
  const key = `${home.lat.toFixed(3)},${home.lon.toFixed(3)}`;
  const lineUp = fingerprint(mountains.map((m) => `${m.id}@${m.trailhead.lat},${m.trailhead.lon}`).join("|"));
  return unstable_cache(() => orsMatrix(home, mountains, apiKey), ["ors-matrix", key, lineUp], {
    revalidate: 86400,
  })();
}

/** A short, stable label for a long string (FNV-1a), to keep cache keys small. */
export function fingerprint(text: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}
