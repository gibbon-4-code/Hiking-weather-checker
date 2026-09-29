import { describe, expect, it } from "vitest";
import { MOUNTAINS } from "@/data/mountains";
import { normaliseMetOffice, type MetOfficeResponse } from "./metoffice";

const snowdon = MOUNTAINS.find((m) => m.id === "yr-wyddfa")!;

const sample: MetOfficeResponse = {
  features: [
    {
      geometry: { coordinates: [-4.0763, 53.0685, 585] },
      properties: {
        modelRunDate: "2026-09-29T09:00Z",
        timeSeries: [
          {
            time: "2026-10-03T09:00Z",
            maxScreenAirTemp: 10,
            minScreenAirTemp: 8,
            feelsLikeTemp: 6,
            windSpeed10m: 5,
            windGustSpeed10m: 10,
            max10mWindGust: 12,
            visibility: 25000,
            probOfPrecipitation: 20,
            totalPrecipAmount: 0.2,
            probOfThunder: 0,
            significantWeatherCode: 3,
          },
          { time: "2026-10-04T12:00Z", maxScreenAirTemp: 9, minScreenAirTemp: 7, significantWeatherCode: 15 },
          { time: "2026-10-06T12:00Z", maxScreenAirTemp: 9, minScreenAirTemp: 7, significantWeatherCode: 1 },
        ],
      },
    },
  ],
};

describe("normaliseMetOffice", () => {
  const f = normaliseMetOffice(sample, snowdon, ["2026-10-03", "2026-10-04"]);

  it("groups three-hourly steps into the weekend days only", () => {
    expect(f.days.map((d) => d.slots.length)).toEqual([1, 1]);
  });

  it("converts m/s to mph and keeps the strongest gust", () => {
    const s = f.days[0].slots[0];
    expect(s.windMph).toBe(11);
    expect(s.gustMph).toBe(27);
  });

  it("adjusts temperatures from the grid point up to the summit", () => {
    // 500 m higher at 0.65 °C per 100 m is 3.25 °C colder.
    expect(f.days[0].slots[0].tempC).toBeCloseTo(9 - 3.25, 0);
    expect(f.modelElevationM).toBe(585);
  });

  it("maps weather codes", () => {
    expect(f.days[0].slots[0].condition).toBe("partly-cloudy");
    expect(f.days[1].slots[0].condition).toBe("heavy-rain");
  });
});
