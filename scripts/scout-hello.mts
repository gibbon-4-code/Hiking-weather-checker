/**
 * Weekend Scout, stage 1: one call to Claude, with no tools.
 *
 * The code decides what data to fetch (Saturday's ranking), puts it in the prompt, and asks Claude
 * for a recommendation. Claude can't ask for anything else, so this is a single call, not an agent.
 *
 *   npm run scout:hello                 the coming Saturday, from Brighton
 *   npm run scout:hello -- 2026-10-11   a specific day
 *
 * Needs ANTHROPIC_API_KEY in .env.local. Each run costs a few cents and prints the exact cost.
 */
import Anthropic from "@anthropic-ai/sdk";
import { formatRanking, rankDay } from "@/lib/agent/ranking";
import { defaultHikeDate, isPlannableDate } from "@/lib/dates";
import { env } from "@/lib/env";
import { buildPlan } from "@/lib/plan";

const MODEL = "claude-opus-5-5";
// Claude Opus 5.5 list prices, in dollars per million tokens.
const PRICE = { input: 4, output: 20 };

const SYSTEM = `You help one person in Brighton decide where to go hill walking.
You get a ranked list of hills for one day, scored by an app from the forecast, the drive and how good the walk is.
Recommend one hill, or say it isn't worth going. Explain why in three or four short bullet points, in plain British English.
Never recommend a hill marked UNSAFE.`;

if (!env.anthropicKey) {
  console.error("No ANTHROPIC_API_KEY found. Add it to .env.local (see .env.example) and try again.");
  process.exit(1);
}

const date = process.argv[2] ?? defaultHikeDate();
if (!isPlannableDate(date)) {
  console.error(`Pick a day between today and two weeks from now, written YYYY-MM-DD (got "${date}").`);
  process.exit(1);
}

// 1. Our code gathers the data, exactly as the results page does.
const plan = await buildPlan(date);
const ranking = formatRanking(date, rankDay(plan));
console.log(`--- What we send Claude ---\n${ranking}\n`);

// 2. One call: a system prompt that sets the job, and one user message with the data.
const client = new Anthropic({ apiKey: env.anthropicKey });
const response = await client.beta.messages.create({
  model: MODEL,
  max_tokens: 16000,
  // How hard Claude thinks before answering. Opus 5.5 defaults to "medium"; set it so it's visible.
  output_config: { effort: "medium" },
  // If a safety check declines the request, the API retries on another model instead of failing.
  betas: ["server-side-fallback-2026-07-01"],
  fallbacks: "default",
  system: SYSTEM,
  messages: [{ role: "user", content: `${ranking}\n\nWhere should I go on ${date}?` }],
});

// 3. Read the answer. The reply is a list of blocks; the text blocks are the answer.
if (response.stop_reason === "refusal") {
  console.error("Claude declined to answer:", response.stop_details?.explanation ?? "no reason given");
  process.exit(1);
}
const answer = response.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("\n");
console.log(`--- Claude's answer ---\n${answer}\n`);

// 4. What it cost. Thinking tokens are billed as output tokens.
const { input_tokens, output_tokens } = response.usage;
const cost = (input_tokens * PRICE.input + output_tokens * PRICE.output) / 1_000_000;
console.log(`--- Usage ---\nModel: ${response.model}\nInput: ${input_tokens} tokens, output: ${output_tokens} tokens`);
console.log(`Cost: $${cost.toFixed(4)} (stopped because: ${response.stop_reason})`);
