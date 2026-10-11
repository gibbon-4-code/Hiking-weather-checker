/**
 * Runs the Weekend Scout against every eval case and grades the answers.
 *
 *   npm run eval                              all cases, 2 runs each
 *   npm run eval -- --cases real-weekend,dangerous-weekend --reps 1
 *   npm run eval -- --variant v1              save under a new name, to compare later
 *
 * Each case uses frozen forecasts, so only Claude's behaviour varies. Results are written as each
 * run finishes, and re-running skips runs already saved, so a crash loses nothing.
 *
 * Writes evals/scout/runs/<variant>/:
 *   results.jsonl   one line per run: the checks, the judge's verdict, cost and timing
 *   traces/         the full conversation for every run
 *   errors.jsonl    runs that broke before producing an answer (API errors, timeouts)
 *
 * Needs ANTHROPIC_API_KEY in .env.local. Costs real money: about 6 cents per run plus the judge.
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import Anthropic from "@anthropic-ai/sdk";
import { runScout, SCOUT_MODEL, scoutSystemPrompt, type ScoutResult } from "@/lib/agent/scout";
import { env } from "@/lib/env";
import { buildPlans, caseSource, loadCases, loadSnapshot, weekendOf, type EvalCase } from "./fixtures";
import { badToolCalls, briefingFor, checkRules, judgeGrounded, JUDGE_MODEL, toolResultsOf } from "./grade";

const args = new Map<string, string>();
for (let i = 2; i < process.argv.length; i += 2) args.set(process.argv[i].replace(/^--/, ""), process.argv[i + 1]);
const variant = args.get("variant") ?? "baseline";
const reps = Number(args.get("reps") ?? 2);
const only = args.get("cases")?.split(",");
const concurrency = Number(args.get("concurrency") ?? 4);
const TIMEOUT_S = 240;

if (!env.anthropicKey) {
  console.error("No ANTHROPIC_API_KEY found. Add it to .env.local (see .env.example) and try again.");
  process.exit(1);
}
if (!/^(baseline|v\d+)$/.test(variant)) {
  console.error('--variant must be "baseline" or v1, v2, ...');
  process.exit(1);
}

const dir = `evals/scout/runs/${variant}`;
mkdirSync(`${dir}/traces`, { recursive: true });
const client = new Anthropic({ apiKey: env.anthropicKey, maxRetries: 4 });
const snapshot = loadSnapshot();
const week = weekendOf(snapshot);
const now = new Date(snapshot.capturedAt);
const cases = loadCases().filter((c) => !only || only.includes(c.id));

const done = new Set(
  existsSync(`${dir}/results.jsonl`)
    ? readFileSync(`${dir}/results.jsonl`, "utf8").trim().split("\n").filter(Boolean).map((l) => {
        const r = JSON.parse(l);
        return `${r.prompt_id}#${r.rep}`;
      })
    : [],
);
const jobs = cases.flatMap((c) => Array.from({ length: reps }, (_, rep) => ({ c, rep }))).filter(({ c, rep }) => !done.has(`${c.id}#${rep}`));
console.log(`${variant}: ${jobs.length} runs to do (${cases.length} cases × ${reps} reps, ${done.size} already saved)\n`);

/** The conversation in the shape the eval report reads: system, user, tool calls, tool results, answers. */
function trace(result: ScoutResult) {
  const turns: object[] = [{ role: "system", content: scoutSystemPrompt(now) }];
  for (const m of result.transcript) {
    if (typeof m.content === "string") {
      turns.push({ role: m.role, content: m.content });
      continue;
    }
    for (const b of m.content) {
      if (b.type === "text") turns.push({ role: m.role, content: b.text });
      else if (b.type === "tool_use") turns.push({ role: "tool_call", name: b.name, content: JSON.stringify(b.input, null, 2) });
      else if (b.type === "tool_result") turns.push({ role: "tool_result", content: typeof b.content === "string" ? b.content : JSON.stringify(b.content) });
    }
  }
  turns.push({ role: "assistant", content: `Final answer after the app's checks:\n${JSON.stringify(result.answer, null, 2)}` });
  return turns;
}

function withTimeout<T>(promise: Promise<T>, seconds: number): Promise<T> {
  return Promise.race([promise, new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`timed out after ${seconds}s`)), seconds * 1000))]);
}

async function runOne(c: EvalCase, rep: number) {
  const started = Date.now();
  let result: ScoutResult;
  try {
    result = await withTimeout(runScout(caseSource(snapshot, c), client), TIMEOUT_S);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    appendFileSync(`${dir}/errors.jsonl`, JSON.stringify({ prompt_id: c.id, rep, failure: /timed out/.test(message) ? "timeout" : "harness_or_api", message }) + "\n");
    console.log(`  ✗ ${c.id} #${rep}: error (${message})`);
    return;
  }
  const latency_s = (Date.now() - started) / 1000;

  const failures = checkRules(c, result, buildPlans(snapshot, c), week, now);
  let judge;
  try {
    judge = await judgeGrounded(client, briefingFor(now), toolResultsOf(result), result.answer);
  } catch (err) {
    appendFileSync(`${dir}/errors.jsonl`, JSON.stringify({ prompt_id: c.id, rep, failure: "grader", message: String(err), model: result.model, usage: result.usage }) + "\n");
    console.log(`  ✗ ${c.id} #${rep}: the judge failed (${err})`);
    return;
  }

  const truncated = result.stopReason === "max_tokens";
  const row = {
    prompt_id: c.id,
    rep,
    prompt: c.description,
    tags: [c.tag],
    status: truncated ? "truncated" : "ok",
    stop_reason: result.stopReason,
    grade: { passes_checks: failures.length ? 0 : 1, grounded: judge.grounded },
    explanation: {
      passes_checks: failures.length ? failures.join("; ") : "All checks passed.",
      grounded: judge.unsupported.length ? judge.unsupported.map((u) => `"${u.claim}": ${u.why}`).join(" | ") : "No unsupported claims.",
    },
    answer: result.answer,
    guardrail: result.overruled ? "overruled" : result.downgraded ? "downgraded" : result.retried ? "retried" : "passed",
    guardrail_reason: result.overruled ?? result.downgraded ?? result.retried,
    bad_tool_calls: badToolCalls(result, week),
    tool_calls: result.steps.reduce((n, s) => n + s.toolCalls.length, 0),
    turns: result.transcript.filter((m) => m.role === "assistant").length,
    latency_s,
    model: result.model,
    usage: { input_tokens: result.usage.input, output_tokens: result.usage.output },
    cost_usd: result.cost,
    judge_model: judge.model,
    judge_usage: judge.usage,
  };
  if (result.model && result.model !== SCOUT_MODEL) console.log(`  ! ${c.id} #${rep} was served by ${result.model}, not ${SCOUT_MODEL}`);

  writeFileSync(`${dir}/traces/${c.id}_rep${rep}.json`, JSON.stringify(trace(result), null, 2));
  appendFileSync(`${dir}/results.jsonl`, JSON.stringify(row) + "\n");
  const mark = (v: number) => (v ? "✓" : "✗");
  console.log(
    `  ${c.id} #${rep}: checks ${mark(row.grade.passes_checks)}  no made-up facts ${mark(row.grade.grounded)}  ` +
      `(${result.answer.verdict} ${result.answer.mountainId ?? ""} ${result.answer.date ?? ""}, ${latency_s.toFixed(0)}s, $${result.cost.toFixed(3)})`,
  );
}

// Run a few at a time.
const queue = [...jobs];
await Promise.all(Array.from({ length: concurrency }, async () => {
  for (let job = queue.shift(); job; job = queue.shift()) await runOne(job.c, job.rep);
}));

// The summary, recomputed from everything saved for this variant.
const rows = readFileSync(`${dir}/results.jsonl`, "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l));
const ok = rows.filter((r) => r.status === "ok");
const rate = (key: "passes_checks" | "grounded") => ok.reduce((n, r) => n + r.grade[key], 0) / (ok.length || 1);
const margin = 1.96 * Math.sqrt((rate("passes_checks") * (1 - rate("passes_checks"))) / (ok.length || 1));
const judgeCost = rows.reduce((n, r) => n + (r.judge_usage.input_tokens * 2 + r.judge_usage.output_tokens * 10) / 1e6, 0);
const scoutCost = rows.reduce((n, r) => n + r.cost_usd, 0);
const errors = existsSync(`${dir}/errors.jsonl`) ? readFileSync(`${dir}/errors.jsonl`, "utf8").trim().split("\n").filter(Boolean).length : 0;

writeFileSync(
  "evals/scout/runs/_state.json",
  JSON.stringify(
    {
      flow: "weekend-scout",
      metrics: [
        { id: "passes_checks", label: "Passes checks", kind: "binary" },
        { id: "grounded", label: "No made-up", kind: "binary" },
      ],
      perf_fields: ["cost_usd", "latency_s", "tool_calls", "turns"],
      prices: { [SCOUT_MODEL]: { in: 4, out: 20 }, [JUDGE_MODEL]: { in: 2, out: 10 } },
    },
    null,
    2,
  ),
);

console.log(`\n${variant}: ${ok.length} runs scored, ${rows.length - ok.length} truncated, ${errors} errors`);
console.log(`  Passes checks:    ${(rate("passes_checks") * 100).toFixed(0)}% (±${(margin * 100).toFixed(0)} points)`);
console.log(`  No made-up facts: ${(rate("grounded") * 100).toFixed(0)}%`);
console.log(`  Guardrail stepped in: ${rows.filter((r) => r.guardrail !== "passed").length} of ${rows.length} runs`);
console.log(`  Cost: $${scoutCost.toFixed(2)} Scout + $${judgeCost.toFixed(2)} judge = $${(scoutCost + judgeCost).toFixed(2)}`);
