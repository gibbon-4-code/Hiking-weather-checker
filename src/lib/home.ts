import "server-only";
import { BRIGHTON } from "@/data/mountains";
import { lookupLocation, normalisePostcode } from "@/lib/providers/location";
import type { Home } from "@/lib/types";

/**
 * The starting point for a search: a UK postcode or a town name. Brighton is the default, so it
 * skips the lookup. Throws `LocationError` when the place can't be found.
 */
export async function resolveHome(from: string | null | undefined): Promise<Home> {
  const text = from?.trim();
  if (!text || isBrighton(text)) return BRIGHTON;
  return lookupLocation(text);
}

function isBrighton(from: string) {
  return from.toLowerCase() === "brighton" || normalisePostcode(from) === BRIGHTON.postcode;
}
