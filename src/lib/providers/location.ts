import type { Home } from "@/lib/types";

const UK_POSTCODE = /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i;
const UK_OUTCODE = /^[A-Z]{1,2}\d[A-Z\d]?$/i;
/** Letters, spaces, hyphens, apostrophes and full stops: "St. Ives", "Bishop's Stortford", "Stoke-on-Trent". */
const PLACE_NAME = /^[\p{L}][\p{L} .'’-]{1,59}$/u;

/** Bigger places first, so "Newport" means the city in Wales rather than one of a dozen villages. */
const PLACE_RANK = ["City", "Town", "Village", "Suburban Area", "Hamlet", "Other Settlement"];

export class LocationError extends Error {}

export function normalisePostcode(input: string) {
  return input.trim().toUpperCase().replace(/\s+/g, " ");
}

/** One result from postcodes.io's place search (Ordnance Survey place names). */
export interface PlaceResult {
  name_1: string;
  name_2: string | null;
  local_type: string;
  county_unitary: string | null;
  district_borough: string | null;
  country: string;
  latitude: number;
  longitude: number;
}

/**
 * The best match for what someone typed. Exact name matches beat partial ones, then bigger places
 * beat smaller ones. Welsh and Gaelic places have two names ("Casnewydd" / "Newport"), so the label
 * uses whichever one the person typed.
 */
export function pickPlace(query: string, places: PlaceResult[]): Home | null {
  const q = query.trim().toLowerCase();
  const matchedName = (p: PlaceResult) =>
    [p.name_1, p.name_2].find((n) => n?.toLowerCase() === q) ?? p.name_1;
  const rank = (p: PlaceResult) => {
    const exact = [p.name_1, p.name_2].some((n) => n?.toLowerCase() === q) ? 0 : 1;
    const size = PLACE_RANK.indexOf(p.local_type);
    return exact * 100 + (size === -1 ? PLACE_RANK.length : size);
  };
  const best = [...places].sort((a, b) => rank(a) - rank(b))[0];
  if (!best) return null;

  const name = matchedName(best);
  // Bilingual areas come back as "Casnewydd - Newport"; the English half reads better in a label.
  const county = (best.county_unitary ?? best.district_borough ?? "").split(" - ").pop();
  const area = county && county.toLowerCase() !== name.toLowerCase() ? county : best.country;
  return { label: `${name}, ${area}`, postcode: null, lat: best.latitude, lon: best.longitude };
}

/** Turns a UK postcode, postcode district ("LA22") or town name into coordinates. */
export async function lookupLocation(input: string): Promise<Home> {
  const text = input.trim();
  const pc = normalisePostcode(text);
  if (UK_POSTCODE.test(pc) || UK_OUTCODE.test(pc)) return lookupPostcode(pc, UK_POSTCODE.test(pc));
  if (!PLACE_NAME.test(text)) throw new LocationError(`"${input}" doesn't look like a UK postcode or town`);

  const res = await fetch(`https://api.postcodes.io/places?q=${encodeURIComponent(text)}&limit=100`, {
    next: { revalidate: 60 * 60 * 24 * 30 },
  });
  if (!res.ok) throw new Error(`postcodes.io ${res.status}`);
  const { result } = (await res.json()) as { result: PlaceResult[] | null };
  const home = pickPlace(text, result ?? []);
  if (!home) throw new LocationError(`Couldn't find "${text}". Check the spelling, or try a postcode.`);
  return home;
}

async function lookupPostcode(pc: string, full: boolean): Promise<Home> {
  const url = full
    ? `https://api.postcodes.io/postcodes/${encodeURIComponent(pc)}`
    : `https://api.postcodes.io/outcodes/${encodeURIComponent(pc)}`;
  const res = await fetch(url, { next: { revalidate: 60 * 60 * 24 * 30 } });
  if (res.status === 404) throw new LocationError(`Couldn't find postcode ${pc}`);
  if (!res.ok) throw new Error(`postcodes.io ${res.status}`);

  const { result } = (await res.json()) as {
    result: { latitude: number; longitude: number; admin_district?: string | string[]; postcode?: string; outcode?: string };
  };
  const district = Array.isArray(result.admin_district) ? result.admin_district[0] : result.admin_district;
  return {
    label: district ?? pc,
    postcode: result.postcode ?? result.outcode ?? pc,
    lat: result.latitude,
    lon: result.longitude,
  };
}
