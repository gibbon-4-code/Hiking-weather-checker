import { describe, expect, it } from "vitest";
import { pickPlace, type PlaceResult } from "@/lib/providers/location";

const place = (p: Partial<PlaceResult> & Pick<PlaceResult, "name_1" | "local_type">): PlaceResult => ({
  name_2: null,
  county_unitary: null,
  district_borough: null,
  country: "England",
  latitude: 51,
  longitude: -1,
  ...p,
});

// Trimmed from real postcodes.io answers, in the order it returned them.
const NEWPORT = [
  place({ name_1: "Newport", local_type: "Village", county_unitary: "Highland", country: "Scotland" }),
  place({ name_1: "Newport", local_type: "Town", county_unitary: "Telford and Wrekin" }),
  place({ name_1: "Trefdraeth", name_2: "Newport", local_type: "Town", county_unitary: "Sir Benfro - Pembrokeshire", country: "Wales" }),
  place({ name_1: "Casnewydd", name_2: "Newport", local_type: "City", county_unitary: "Casnewydd - Newport", country: "Wales", latitude: 51.58, longitude: -2.99 }),
  place({ name_1: "Newport Pagnell", local_type: "Town", county_unitary: "Milton Keynes" }),
];

describe("pickPlace", () => {
  it("prefers the biggest exact match, using the name that was typed", () => {
    expect(pickPlace("newport", NEWPORT)).toEqual({ label: "Newport, Wales", postcode: null, lat: 51.58, lon: -2.99 });
  });

  it("finds Welsh and Gaelic places by their English name", () => {
    const fortWilliam = [place({ name_1: "An Gearasdan", name_2: "Fort William", local_type: "Town", county_unitary: "Highland", country: "Scotland" })];
    expect(pickPlace("Fort William", fortWilliam)?.label).toBe("Fort William, Highland");
  });

  it("puts an exact match ahead of a bigger partial one", () => {
    const results = [
      place({ name_1: "Little London", local_type: "City" }),
      place({ name_1: "London", local_type: "Hamlet", county_unitary: "Greater London" }),
    ];
    expect(pickPlace("London", results)?.label).toBe("London, Greater London");
  });

  it("returns nothing when there are no results", () => {
    expect(pickPlace("winchestr", [])).toBeNull();
  });
});
