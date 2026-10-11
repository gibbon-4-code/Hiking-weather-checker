import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { checkAnswer, scoutAnswerSchema, type ScoutAnswer } from "@/lib/agent/guardrail";
import { createScoutTools, type ScoutSource } from "@/lib/agent/tools";
import { describeFilters, weekendBrief, type ScoutBrief } from "@/lib/agent/brief";
import { formatDayName, londonParts } from "@/lib/dates";
import type { PlanResponse } from "@/lib/types";

export const SCOUT_MODEL = "claude-opus-5-5";
/** Claude Opus 5.5 list prices, in dollars per million tokens. Thinking counts as output. */
const PRICE = { input: 4, output: 20 };
/** The harness's own safety limit: never let the loop run away, whatever the model asks for. */
export const MAX_TURNS = 6;

export { weekend } from "@/lib/agent/brief";

const RULES = `Use the tools to look at the data before deciding. Only state facts about the weather, the hills or the drive that the tools gave you; don't add details from general knowledge.
Never recommend a hill marked UNSAFE.

When you've decided, give a verdict: go (worth it: here's where and when), wait (could be good, but check again nearer the day) or skip (not worth it, or not safe). Then the hill and the day, a one-line headline and three or four short reasons. Write in plain British English.`;

/** The Scout's briefing. The weekend version is word for word what the stage 4 evals measured. */
export function scoutSystemPrompt(now: Date, brief: ScoutBrief = weekendBrief(now)) {
  const today = londonParts(now).date;
  if (brief.kind === "weekend") {
    const [saturday, sunday] = brief.days;
    return `You are the Weekend Scout for Summit Planner. You help one person who lives in Brighton decide whether this weekend is worth a hill walk, and if so where and on which day.

Today is ${today}. This weekend is Saturday ${saturday} and Sunday ${sunday}.

${RULES}`;
  }
  const [chosen, ...others] = brief.days;
  const filters = describeFilters(brief.prefs);
  const alternatives = others.length
    ? `Focus on the day they chose. You may also check ${others.map((d) => `${formatDayName(d)} (${d})`).join(" or ")}, and suggest it instead if it's clearly better.`
    : "Focus on the day they chose.";
  return `You are the Scout for Summit Planner. You help one person decide whether a day is worth a hill walk, and if so where to go. They're setting off from ${brief.home.label}${filters ? ` and want ${filters}` : ""}. The ranking tool already applies those limits.

Today is ${today}. They've asked about ${formatDayName(chosen)} (${chosen}). ${alternatives}

${RULES}`;
}

export const SCOUT_QUESTION = "Is this weekend worth a hike? If so, where should I go and which day?";

/** What the person asks, in words. */
export function scoutQuestion(brief: ScoutBrief) {
  if (brief.kind === "weekend") return SCOUT_QUESTION;
  return `Is ${formatDayName(brief.days[0])} a good day for a hill walk from ${brief.home.label}? If so, where should I go?`;
}

/** The request settings shared by the hand-written loop and the Tool Runner. */
export function scoutRequest(now: Date, brief: ScoutBrief = weekendBrief(now)) {
  return {
    model: SCOUT_MODEL,
    max_tokens: 16000,
    output_config: { effort: "medium" as const },
    // If a safety check declines the request, the API retries on another model instead of failing.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default" as const,
    system: scoutSystemPrompt(now, brief),
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
  /** The answer after the guardrail: the model's own, a "wait" if the code downgraded it, or "skip". */
  answer: ScoutAnswer;
  /** Why the code overruled the model's final answer and replaced it with "skip", or null. */
  overruled: string | null;
  /** Why the code turned a "go" into a "wait", or null. */
  downgraded: string | null;
  /** Why the first answer failed the guardrail and Claude was asked to choose again, or null. */
  retried: string | null;
  steps: ScoutStep[];
  usage: { input: number; output: number };
  cost: number;
  stopReason: string | null;
  /** The model that actually served the last reply (a refusal fallback can change it). */
  model: string | null;
  /** The whole conversation, for logs, evals and debugging. */
  transcript: Anthropic.Beta.BetaMessageParam[];
}

/** How many times Claude may try again after a pick fails the guardrail. */
export const MAX_RETRIES = 1;

/**
 * Runs the Scout with the SDK's Tool Runner: the same loop as `scripts/scout-loop.mts`, but the SDK
 * makes the calls, runs the tools and sends the results back. We still see every turn as it happens.
 *
 * Since stage 3, the final answer must match `scoutAnswerSchema` (the API enforces it), and
 * `checkAnswer` then re-checks the pick against the app's rules in code. If the pick fails, Claude
 * is told why and asked to choose again, once. If it fails again, the code's "skip" stands.
 */
export async function runScout(
  source: ScoutSource,
  client: Anthropic,
  onStep?: (step: ScoutStep) => void,
  brief: ScoutBrief = weekendBrief(source.now()),
): Promise<ScoutResult> {
  source = rememberPlans(source);
  const now = source.now();
  const request = scoutRequest(now, brief);
  const tools = createScoutTools(source, brief);

  const steps: ScoutStep[] = [];
  const usage = { input: 0, output: 0 };
  let messages: Anthropic.Beta.BetaMessageParam[] = [{ role: "user", content: scoutQuestion(brief) }];
  let retried: string | null = null;

  for (let attempt = 0; ; attempt++) {
    const runner = client.beta.messages.toolRunner({
      ...request,
      output_config: { ...request.output_config, format: betaZodOutputFormat(scoutAnswerSchema) },
      tools,
      max_iterations: MAX_TURNS,
      messages,
    });

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

    const base = {
      steps,
      usage,
      cost: costOf(usage),
      stopReason: last?.stop_reason ?? null,
      model: last?.model ?? null,
      transcript: [...runner.params.messages],
      retried,
    };
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
      return { ...base, answer, overruled: "no usable answer", downgraded: null };
    }

    // The guardrail. Check the pick against our own rules, using the plan the model saw for that day.
    const plan = parsed.date && brief.days.includes(parsed.date) ? await source.plan(parsed.date) : null;
    const checked = checkAnswer(parsed, plan, brief.days, now, brief.prefs);
    if (!checked.overruled || attempt >= MAX_RETRIES) return { ...base, ...checked };

    // The pick failed. Carry on the same conversation (it already holds Claude's answer), tell
    // Claude exactly what failed, and let it choose again.
    retried = checked.overruled;
    messages = [
      ...runner.params.messages,
      {
        role: "user",
        content:
          `Your answer failed a check in the app: ${checked.overruled}. ` +
          `Choose again, using only hills and days from the tool results, or answer skip if nothing ${brief.kind === "weekend" ? "this weekend" : "on these days"} is suitable.`,
      },
    ];
  }
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
