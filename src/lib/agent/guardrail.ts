import { z } from "zod";
import { DEFAULT_PREFERENCES, inSearch, scoreDestination, type Preferences } from "@/lib/scoring";
import type { PlanResponse } from "@/lib/types";

/**
 * The shape the Scout must answer in. The API enforces it (structured output), so the app gets
 * fields it can check and display, not a paragraph it has to read.
 */
export const scoutAnswerSchema = z.object({
  verdict: z
    .enum(["go", "wait", "skip"])
    .describe("go: worth it, here's where and when. wait: could be good, but check again nearer the day. skip: not worth it or not safe."),
  mountainId: z.string().nullable().describe("The id of the hill you recommend, as shown in get_day_ranking. Null for skip."),
  date: z.string().nullable().describe("The day you recommend, written YYYY-MM-DD. Null for skip."),
  headline: z.string().describe("One short sentence summing up the advice."),
  reasons: z.array(z.string()).describe("Three or four short reasons, each a plain sentence using only facts from the tools."),
  confidence: z.enum(["high", "medium", "low"]).describe("How sure you are, given how far ahead the forecast is and how close the options are."),
});

export type ScoutAnswer = z.infer<typeof scoutAnswerSchema>;

export interface CheckedAnswer {
  answer: ScoutAnswer;
  /** Why the code overruled the model, or null when the model's answer stood. */
  overruled: string | null;
}

/**
 * The model judges; this code enforces. Whatever the model said, a pick must be a real hill, on a
 * day this weekend, that fits the search and passes every safety rule in `safetyVetoes`. If it
 * doesn't, the answer becomes "skip" and says why. `plan` is the plan for the picked day.
 */
export function checkAnswer(
  answer: ScoutAnswer,
  plan: PlanResponse | null,
  weekendDates: string[],
  now: Date,
  prefs: Preferences = DEFAULT_PREFERENCES,
): CheckedAnswer {
  if (answer.verdict === "skip") return { answer, overruled: null };

  const problem = findProblem(answer, plan, weekendDates, now, prefs);
  if (!problem) return { answer, overruled: null };
  return {
    answer: {
      verdict: "skip",
      mountainId: null,
      date: null,
      headline: "No safe recommendation this time.",
      reasons: [`The Scout suggested something that failed a check: ${problem}.`],
      confidence: "low",
    },
    overruled: problem,
  };
}

function findProblem(
  answer: ScoutAnswer,
  plan: PlanResponse | null,
  weekendDates: string[],
  now: Date,
  prefs: Preferences,
): string | null {
  if (!answer.mountainId || !answer.date) return `a "${answer.verdict}" verdict without a hill and a day`;
  if (!weekendDates.includes(answer.date)) return `${answer.date} isn't this weekend`;
  const destination = plan?.day.date === answer.date
    ? plan.destinations.find((d) => d.mountain.id === answer.mountainId)
    : undefined;
  if (!destination) return `there's no hill with the id "${answer.mountainId}" in the plan for ${answer.date}`;

  const name = destination.mountain.name;
  const score = scoreDestination(destination, prefs, now);
  const day = score.days.find((d) => d.date === answer.date);
  if (!day) return `there's no usable forecast for ${name} on ${answer.date}`;
  if (day.vetoes.length) return `${name} is unsafe on ${answer.date} (${day.vetoes.join("; ")})`;
  if (!inSearch(score)) return `${name} is outside the search (too far, or the wrong length of walk)`;
  return null;
}
