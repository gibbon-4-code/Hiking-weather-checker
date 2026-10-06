/**
 * Weekend Scout, stage 2: the same agent as `scout-loop.mts`, run by the SDK's Tool Runner.
 *
 *   npm run scout
 *
 * Needs ANTHROPIC_API_KEY in .env.local. Each run costs a few cents and prints the exact cost.
 */
import Anthropic from "@anthropic-ai/sdk";
import { liveSource } from "@/lib/agent/live-source";
import { runScout, SCOUT_QUESTION } from "@/lib/agent/scout";
import { env } from "@/lib/env";

if (!env.anthropicKey) {
  console.error("No ANTHROPIC_API_KEY found. Add it to .env.local (see .env.example) and try again.");
  process.exit(1);
}

console.log(`You: ${SCOUT_QUESTION}\n`);

const result = await runScout(liveSource, new Anthropic({ apiKey: env.anthropicKey }), (step) => {
  for (const call of step.toolCalls) console.log(`Turn ${step.turn}: Claude asks for ${call.name}(${JSON.stringify(call.input)})`);
});

console.log(`\n--- Claude's answer ---\n${result.answer}\n`);
console.log(`--- Usage ---\nInput: ${result.usage.input} tokens, output: ${result.usage.output} tokens`);
console.log(`Cost: $${result.cost.toFixed(4)} (stopped because: ${result.stopReason})`);
