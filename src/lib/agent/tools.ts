import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { BetaRunnableTool } from "@anthropic-ai/sdk/lib/tools/BetaRunnableTool";
import { z } from "zod";
import { MOUNTAINS } from "@/data/mountains";
import { describeWeather, formatRanking, rankDay } from "@/lib/agent/ranking";
import { isPlannableDate } from "@/lib/dates";
import { summariseDay } from "@/lib/scoring";
import type { DestinationForecast, PlanResponse } from "@/lib/types";

/**
 * Where the tools get their data. The live version calls the weather and routing APIs; the evals in
 * stage 4 swap in frozen forecasts, so the same agent can be tested on known days.
 */
export interface ScoutSource {
  plan(date: string): Promise<PlanResponse>;
  secondOpinion(mountainId: string, date: string): Promise<DestinationForecast | null>;
  /** "Today", so forecasts further ahead are trusted less. Fixed in evals, real time otherwise. */
  now(): Date;
}

const date = z.string().describe("The day to check, written YYYY-MM-DD.");

/**
 * The Scout's tools. Each one has a name and a description (which is all the model sees, so they're
 * written like product copy), an input schema, and a `run` function that is our own code.
 * The model never runs anything: it asks, and the harness calls `run`.
 */
export function createScoutTools(source: ScoutSource): BetaRunnableTool[] {
  const getDayRanking = betaZodTool({
    name: "get_day_ranking",
    description:
      "Ranks hill walks within reach of Brighton for one day. Returns the top 10 by the app's score " +
      "(weather during walking hours 09:00 to 16:00, drive time and how good the walk is), with each " +
      "hill's id, drive time, difficulty, wind exposure and weather. Hills marked UNSAFE fail a hard " +
      "safety rule and must not be recommended. Call once per day you want to compare.",
    inputSchema: z.object({ date }),
    run: async ({ date }) => {
      if (!isPlannableDate(date, source.now())) {
        return `Can't plan ${date}: pick a day from today up to two weeks ahead, written YYYY-MM-DD.`;
      }
      const plan = await source.plan(date);
      const text = formatRanking(date, rankDay(plan, undefined, 10, source.now()));
      return plan.notices.length ? `${text}\n\nNotes: ${plan.notices.join(" ")}` : text;
    },
  });

  const getSecondOpinion = betaZodTool({
    name: "get_second_opinion",
    description:
      "Gets the Met Office forecast for one hill on one day, as a second opinion on the forecast " +
      "behind the ranking. Useful when a pick looks borderline. Only works up to about 6 days ahead, " +
      "and may be unavailable.",
    inputSchema: z.object({
      mountainId: z.string().describe("The hill's id, as shown in get_day_ranking."),
      date,
    }),
    run: async ({ mountainId, date }) => {
      const mountain = MOUNTAINS.find((m) => m.id === mountainId);
      if (!mountain) return `There's no hill with the id "${mountainId}".`;
      const forecast = await source.secondOpinion(mountainId, date);
      const summary = forecast?.days[0] ? summariseDay(forecast.days[0]) : null;
      if (!summary) return `No Met Office forecast is available for ${mountain.name} on ${date}.`;
      return `Met Office for ${mountain.name} on ${date}, walking hours: ${describeWeather(summary)}.`;
    },
  });

  return [getDayRanking, getSecondOpinion];
}
