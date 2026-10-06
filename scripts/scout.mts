/**
 * Weekend Scout: the same agent as `scout-loop.mts`, run by the SDK's Tool Runner. Since stage 3
 * it answers in a fixed format, and the code checks the pick against the safety rules.
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

const { answer } = result;
console.log(`\n--- The Scout's answer, as the app receives it ---`);
console.log(JSON.stringify(answer, null, 2));
console.log(`\n${answer.verdict.toUpperCase()}: ${answer.headline}`);
for (const reason of answer.reasons) console.log(`  - ${reason}`);
console.log();
if (result.retried) console.log(`Guardrail: rejected the first pick (${result.retried}), and asked Claude to choose again.`);
if (result.overruled) console.log(`Guardrail: OVERRULED the model (${result.overruled}).`);
else if (result.downgraded) console.log(`Guardrail: downgraded go to wait (${result.downgraded}).`);
else console.log("Guardrail: passed.");
console.log();
console.log(`--- Usage ---\nInput: ${result.usage.input} tokens, output: ${result.usage.output} tokens`);
console.log(`Cost: $${result.cost.toFixed(4)} (stopped because: ${result.stopReason})`);
