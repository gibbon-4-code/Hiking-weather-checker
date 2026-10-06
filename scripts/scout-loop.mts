/**
 * Weekend Scout, stage 2: the agent loop, written by hand.
 *
 * Claude now has tools. It decides which days to look at and whether it needs a second opinion;
 * this script just runs the loop: ask Claude, run any tools it asked for, send the results back,
 * and repeat until it answers. That loop, plus its limits, is the "harness".
 *
 *   npm run scout:loop      the hand-written loop (this file)
 *   npm run scout           the same agent using the SDK's Tool Runner (src/lib/agent/scout.ts)
 *
 * Needs ANTHROPIC_API_KEY in .env.local. Each run costs a few cents and prints the exact cost.
 */
import Anthropic from "@anthropic-ai/sdk";
import { liveSource } from "@/lib/agent/live-source";
import { costOf, MAX_TURNS, SCOUT_QUESTION, scoutRequest } from "@/lib/agent/scout";
import { createScoutTools } from "@/lib/agent/tools";
import { env } from "@/lib/env";

if (!env.anthropicKey) {
  console.error("No ANTHROPIC_API_KEY found. Add it to .env.local (see .env.example) and try again.");
  process.exit(1);
}

const client = new Anthropic({ apiKey: env.anthropicKey });
const tools = createScoutTools(liveSource);
// Each tool is a name, a description, an input schema and a `run` function. Only the first three are
// sent to the API (code can't travel as JSON, so `run` stays here, on our side). Claude decides what
// to call from the description alone.

// The conversation so far. It starts with one question, and grows every turn.
const messages: Anthropic.Beta.BetaMessageParam[] = [{ role: "user", content: SCOUT_QUESTION }];
const usage = { input: 0, output: 0 };

console.log(`You: ${SCOUT_QUESTION}\n`);

for (let turn = 1; turn <= MAX_TURNS; turn++) {
  // 1. Send the whole conversation, plus the list of tools Claude may ask for.
  const response = await client.beta.messages.create({
    ...scoutRequest(liveSource.now()),
    tools,
    messages,
  });
  usage.input += response.usage.input_tokens;
  usage.output += response.usage.output_tokens;

  // 2. Keep Claude's reply in the conversation exactly as it came back (including any tool requests
  //    and hidden thinking), so the next turn sees what it already decided.
  messages.push({ role: "assistant", content: response.content });

  // 3. Did it finish, or does it want something?
  if (response.stop_reason === "refusal") {
    console.error("Claude declined to answer:", response.stop_details?.explanation ?? "no reason given");
    process.exit(1);
  }
  const requests = response.content.filter((b) => b.type === "tool_use");
  if (response.stop_reason !== "tool_use" || !requests.length) {
    const answer = response.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("\n");
    console.log(`--- Claude's answer (after ${turn} turns) ---\n${answer}\n`);
    break;
  }

  // 4. Run every tool it asked for. This is our code, not the model's: we look the tool up by name,
  //    check the input against its schema, and run it. A failure goes back as an error result, so
  //    Claude can see it and adjust rather than the whole run crashing.
  const results: Anthropic.Beta.BetaToolResultBlockParam[] = await Promise.all(
    requests.map(async (request) => {
      console.log(`Turn ${turn}: Claude asks for ${request.name}(${JSON.stringify(request.input)})`);
      const tool = tools.find((t) => t.name === request.name);
      try {
        if (!tool) throw new Error(`There's no tool called ${request.name}.`);
        const output = await tool.run(tool.parse(request.input));
        const text = typeof output === "string" ? output : JSON.stringify(output);
        console.log(`  → ${text.split("\n")[0]}${text.includes("\n") ? " …" : ""}`);
        return { type: "tool_result" as const, tool_use_id: request.id, content: output };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.log(`  → error: ${message}`);
        return { type: "tool_result" as const, tool_use_id: request.id, content: message, is_error: true };
      }
    }),
  );
  console.log();

  // 5. Send all the results back in one message, and go round again.
  messages.push({ role: "user", content: results });

  if (turn === MAX_TURNS) console.log(`Stopped after ${MAX_TURNS} turns without an answer (the harness's limit).`);
}

console.log(`--- Usage ---\nInput: ${usage.input} tokens, output: ${usage.output} tokens`);
console.log(`Cost: $${costOf(usage).toFixed(4)}`);
