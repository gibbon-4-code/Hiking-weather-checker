import "server-only";
import type { ScoutSource } from "@/lib/agent/tools";
import { buildPlan, buildSecondOpinion } from "@/lib/plan";

/** The real data: live forecasts and drive times from Brighton, the same as the results page. */
export const liveSource: ScoutSource = {
  plan: (date) => buildPlan(date),
  secondOpinion: (mountainId, date) => buildSecondOpinion(mountainId, date),
  now: () => new Date(),
};
