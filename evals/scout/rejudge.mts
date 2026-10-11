/**
 * Re-runs only the "no made-up facts" judge on answers already saved, after a change to the judge.
 * The Scout isn't called again, so it costs about a cent per run.
 *
 *   npm run eval:rejudge -- --variant baseline
 */
import { readFileSync, writeFileSync } from "node:fs";
import Anthropic from "@anthropic-ai/sdk";
import { env } from "@/lib/env";
import { loadSnapshot } from "./fixtures";
import { briefingFor, judgeGrounded } from "./grade";

const variant = process.argv[process.argv.indexOf("--variant") + 1] ?? "baseline";
const dir = `evals/scout/runs/${variant}`;
const client = new Anthropic({ apiKey: env.anthropicKey, maxRetries: 4 });
const briefing = briefingFor(new Date(loadSnapshot().capturedAt));

const rows = readFileSync(`${dir}/results.jsonl`, "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l));
const updated = await Promise.all(
  rows.map(async (row) => {
    const turns: { role: string; content: string }[] = JSON.parse(readFileSync(`${dir}/traces/${row.prompt_id}_rep${row.rep}.json`, "utf8"));
    const judge = await judgeGrounded(client, briefing, turns.filter((t) => t.role === "tool_result").map((t) => t.content), row.answer);
    const before = row.grade.grounded;
    row.grade.grounded = judge.grounded;
    row.explanation.grounded = judge.unsupported.length ? judge.unsupported.map((u) => `"${u.claim}": ${u.why}`).join(" | ") : "No unsupported claims.";
    row.judge_model = judge.model;
    row.judge_usage = judge.usage;
    console.log(`${row.prompt_id} #${row.rep}: ${before} → ${judge.grounded}  ${row.explanation.grounded}`);
    return row;
  }),
);
writeFileSync(`${dir}/results.jsonl`, updated.map((r) => JSON.stringify(r)).join("\n") + "\n");
