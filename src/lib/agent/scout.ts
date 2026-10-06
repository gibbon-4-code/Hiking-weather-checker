import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { checkAnswer, scoutAnswerSchema, type ScoutAnswer } from "@/lib/agent/guardrail";
import { createScoutTools, type ScoutSource } from "@/lib/agent/tools";
import { addDays, defaultHikeDate, londonParts } from "@/lib/dates";
import type { PlanResponse } from "@/lib/types";

export const SCOUT_MODEL = "claude-opus-5-5";
/** Claude Opus 5.5 list prices, in dollars per million tokens. Thinking counts as output. */
const PRICE = { input: 4, output: 20 };
/** The harness's own safety limit: never let the loop run away, whatever the model asks for. */
export const MAX_TURNS = 6;

/** The coming weekend, from "today". */
export function weekend(now: Date) {
  const saturday = defaultHikeDate(now);
  return { saturday, sunday: addDays(saturday, 1) };
}

export function scoutSystemPrompt(now: Date) {
  const { saturday, sunday } = weekend(now);
  return `You are the Weekend Scout for Summit Planner. You help one person who lives in Brighton decide whether this weekend is worth a hill walk, and if so where and on which day.

Today is ${londonParts(now).date}. This weekend is Saturday ${saturday} and Sunday ${sunday}.

Use the tools to look at the data before deciding. Only state facts about the weather, the hills or the drive that the tools gave you; don't add details from general knowledge.
Never recommend a hill marked UNSAFE.

When you've decided, give a verdict: go (worth it: here's where and when), wait (could be good, but check again nearer the day) or skip (not worth it, or not safe). Then the hill and the day, a one-line headline and three or four short reasons. Write in plain British English.`;
}

export const SCOUT_QUESTION = "Is this weekend worth a hike? If so, where should I go and which day?";

/** The request settings shared by the hand-written loop and the Tool Runner. */
export function scoutRequest(now: Date) {
  return {
    model: SCOUT_MODEL,
    max_tokens: 16000,
    output_config: { effort: "medium" as const },
    // If a safety check declines the request, the API retries on another model instead of failing.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default" as const,
    system: scoutSystemPrompt(now),
  };
}

export function costOf(usage: { input: number; output: number }) {
  return (usage.input * PRICE.input + usage.output * PRICE.output) / 1_000_000;
}

export interface ScoutStep {
  turn: number;
  toolCalls: { name: string; input: unknown }[];
}

export interface ScoutResult {
  /** The answer after the guardrail: the model's own, or "skip" if the code overruled it. */
  answer: ScoutAnswer;
  /** Why the code overruled the model, or null when the model's answer stood. */
  overruled: string | null;
  steps: ScoutStep[];
  usage: { input: number; output: number };
  cost: number;
  stopReason: string | null;
}

/**
 * Runs the Scout with the SDK's Tool Runner: the same loop as `scripts/scout-loop.mts`, but the SDK
 * makes the calls, runs the tools and sends the results back. We still see every turn as it happens.
 *
 * Two additions since stage 2: the final answer must match `scoutAnswerSchema` (the API enforces
 * it), and `checkAnswer` then re-checks the pick against the safety rules in code.
 */
export async function runScout(
  source: ScoutSource,
  client: Anthropic,
  onStep?: (step: ScoutStep) => void,
): Promise<ScoutResult> {
  source = rememberPlans(source);
  const now = source.now();
  const request = scoutRequest(now);
  const runner = client.beta.messages.toolRunner({
    ...request,
    output_config: { ...request.output_config, format: betaZodOutputFormat(scoutAnswerSchema) },
    tools: createScoutTools(source),
    max_iterations: MAX_TURNS,
    messages: [{ role: "user", content: SCOUT_QUESTION }],
  });

  const steps: ScoutStep[] = [];
  const usage = { input: 0, output: 0 };
  let last: Anthropic.Beta.BetaMessage | null = null;

  for await (const message of runner) {
    last = message;
    usage.input += message.usage.input_tokens;
    usage.output += message.usage.output_tokens;
    const toolCalls = message.content.flatMap((b) => (b.type === "tool_use" ? [{ name: b.name, input: b.input }] : []));
    if (toolCalls.length) {
      const step = { turn: steps.length + 1, toolCalls };
      steps.push(step);
      onStep?.(step);
    }
  }

  const base = { steps, usage, cost: costOf(usage), stopReason: last?.stop_reason ?? null };
  const parsed = parseAnswer(last);
  if (!parsed) {
    const answer: ScoutAnswer = {
      verdict: "skip",
      mountainId: null,
      date: null,
      headline: "The Scout couldn't reach an answer this time.",
      reasons: [`It stopped without a usable answer (${base.stopReason ?? "no reply"}).`],
      confidence: "low",
    };
    return { ...base, answer, overruled: "no usable answer" };
  }

  // The guardrail. Fetch the plan for the day it picked, and check the pick against our own rules.
  const { saturday, sunday } = weekend(now);
  const plan = parsed.date && [saturday, sunday].includes(parsed.date) ? await source.plan(parsed.date) : null;
  return { ...base, ...checkAnswer(parsed, plan, [saturday, sunday], now) };
}

/**
 * Fetches each day's plan once per run. The guardrail then checks the pick against exactly the
 * forecast the model saw, and the weather API isn't asked for the same day twice.
 */
function rememberPlans(source: ScoutSource): ScoutSource {
  const plans = new Map<string, Promise<PlanResponse>>();
  return {
    ...source,
    plan: (date) => {
      if (!plans.has(date)) plans.set(date, source.plan(date));
      return plans.get(date)!;
    },
  };
}

/** The final message's text, read as JSON and checked against the schema. Null if it doesn't fit. */
function parseAnswer(message: Anthropic.Beta.BetaMessage | null): ScoutAnswer | null {
  if (!message || message.stop_reason !== "end_turn") return null;
  const text = message.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
  try {
    const result = scoutAnswerSchema.safeParse(JSON.parse(text));
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}
