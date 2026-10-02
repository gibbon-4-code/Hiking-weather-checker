import type { Home, Mountain } from "@/lib/types";
import { ENGLAND } from "./england";
import { SCOTLAND } from "./scotland";
import { WALES } from "./wales";

export const BRIGHTON: Home = {
  label: "Brighton",
  postcode: "BN1 1AA",
  lat: 50.8263,
  lon: -0.1408,
};

/** Every destination, one file per country. `npm run check:mountains` verifies them against OpenStreetMap. */
export const MOUNTAINS: Mountain[] = [...ENGLAND, ...WALES, ...SCOTLAND];
