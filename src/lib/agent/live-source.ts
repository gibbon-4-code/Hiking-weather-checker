import "server-only";
import { BRIGHTON } from "@/data/mountains";
import type { ScoutSource } from "@/lib/agent/tools";
import { buildPlan, buildSecondOpinion } from "@/lib/plan";
import type { Home } from "@/lib/types";

/** The real data: live forecasts and drive times from `home`, the same as the results page. */
export function liveSource(home: Home = BRIGHTON): ScoutSource {
  return {
    plan: (date) => buildPlan(date, home),
    secondOpinion: (mountainId, date) => buildSecondOpinion(mountainId, date),
    now: () => new Date(),
  };
}
