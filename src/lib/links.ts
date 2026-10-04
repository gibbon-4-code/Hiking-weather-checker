import type { Home, Mountain } from "@/lib/types";

/** Google Maps driving directions from home to the start of the walk. */
export function directionsUrl(home: Home, mountain: Mountain) {
  const params = new URLSearchParams({
    api: "1",
    origin: `${home.lat},${home.lon}`,
    destination: `${mountain.trailhead.lat},${mountain.trailhead.lon}`,
    travelmode: "driving",
  });
  return `https://www.google.com/maps/dir/?${params}`;
}
