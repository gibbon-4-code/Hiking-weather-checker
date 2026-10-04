export type Condition =
  | "clear"
  | "partly-cloudy"
  | "cloudy"
  | "fog"
  | "drizzle"
  | "rain"
  | "heavy-rain"
  | "sleet"
  | "snow"
  | "heavy-snow"
  | "thunder";

export type Difficulty = "Easy" | "Moderate" | "Hard";

/** How badly wind affects the route: a gusty day ruins an exposed ridge far more than a lowland walk. */
export type Exposure = "low" | "medium" | "high" | "extreme";

export type ForecastSource = "metoffice" | "openmeteo" | "demo";

export interface Mountain {
  id: string;
  name: string;
  area: string;
  summit: { lat: number; lon: number; elevationM: number };
  trailhead: { name: string; lat: number; lon: number };
  difficulty: Difficulty;
  exposure: Exposure;
  /** 1 to 5: how rewarding a day out it is when the weather plays ball. */
  quality: number;
  route: string;
  walkingHours: string;
  stayNear: string;
}

/** One forecast step (1 hour from Open-Meteo, 3 hours from the Met Office). */
export interface Slot {
  time: string;
  hours: number;
  tempC: number;
  feelsLikeC: number;
  windMph: number;
  gustMph: number;
  precipProb: number;
  precipMm: number;
  visibilityM: number | null;
  thunderProb: number | null;
  condition: Condition;
}

export interface DayForecast {
  date: string;
  slots: Slot[];
  sunrise: string | null;
  sunset: string | null;
}

export interface DestinationForecast {
  source: ForecastSource;
  issuedAt: string | null;
  /** Height of the grid point the forecast describes, before any adjustment to summit height. */
  modelElevationM: number | null;
  days: DayForecast[];
}

export interface Drive {
  minutes: number;
  km: number;
  method: "openrouteservice" | "estimate";
}

export interface Home {
  label: string;
  postcode: string | null;
  lat: number;
  lon: number;
}

export interface Destination {
  mountain: Mountain;
  forecast: DestinationForecast;
  drive: Drive;
}

export interface PlanResponse {
  generatedAt: string;
  home: Home;
  /** The day being planned for, and how many days from today it is. */
  day: { date: string; daysAway: number };
  destinations: Destination[];
  notices: string[];
  keys: { metOffice: boolean; routing: boolean };
  /** Whether a Met Office second opinion can be fetched for this day (needs a key, and it only reaches ~7 days). */
  secondOpinion: boolean;
}
