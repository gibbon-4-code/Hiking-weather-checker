import type { Home } from "@/lib/types";

const UK_POSTCODE = /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i;
const UK_OUTCODE = /^[A-Z]{1,2}\d[A-Z\d]?$/i;

export class PostcodeError extends Error {}

export function normalisePostcode(input: string) {
  return input.trim().toUpperCase().replace(/\s+/g, " ");
}

export async function lookupPostcode(input: string): Promise<Home> {
  const pc = normalisePostcode(input);
  const full = UK_POSTCODE.test(pc);
  if (!full && !UK_OUTCODE.test(pc)) throw new PostcodeError(`"${input}" doesn't look like a UK postcode`);

  const url = full
    ? `https://api.postcodes.io/postcodes/${encodeURIComponent(pc)}`
    : `https://api.postcodes.io/outcodes/${encodeURIComponent(pc)}`;
  const res = await fetch(url, { next: { revalidate: 60 * 60 * 24 * 30 } });
  if (res.status === 404) throw new PostcodeError(`Couldn't find postcode ${pc}`);
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
