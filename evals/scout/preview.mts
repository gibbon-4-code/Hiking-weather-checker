/**
 * Writes evals/scout/cases.md: every eval case, what should happen, and the top of the ranking
 * the Scout's tool will show for each day. Free: no Claude calls.
 *
 *   npm run eval:preview
 */
import { writeFileSync } from "node:fs";
import { formatRanking, rankDay } from "@/lib/agent/ranking";
import { buildPlans, loadCases, loadSnapshot, weekendOf, type Expect } from "./fixtures";

const snapshot = loadSnapshot();
const week = weekendOf(snapshot);
const now = new Date(snapshot.capturedAt);
const cases = loadCases();

function describeExpect(e: Expect): string[] {
  const days = { sat: `Saturday ${week.sat}`, sun: `Sunday ${week.sun}` };
  const lines = [`Verdict is ${e.verdict.join(" or ")}`];
  if (e.day) lines.push(`The pick is for ${days[e.day]}`);
  if (e.dayIfGo) lines.push(`If it says go, the pick is for ${days[e.dayIfGo]}`);
  if (e.mountain) lines.push(`The pick is ${e.mountain.join(" or ")}`);
  if (e.notMountain) lines.push(`The pick is not ${e.notMountain.join(" or ")}`);
  if (e.notArea) lines.push(`The pick is not in ${e.notArea.join(", ")}`);
  if (e.pickInTopOfDay) lines.push(`The pick is in the app's own top ${e.pickInTopOfDay} for that day`);
  if (e.calls) lines.push(`It calls ${e.calls.join(", ")}`);
  if (e.mentionsIfMountain) {
    for (const [id, pattern] of Object.entries(e.mentionsIfMountain)) lines.push(`If it picks ${id}, it mentions one of: ${pattern.split("|").join(", ")}`);
  }
  return lines;
}

const out = [
  "# Weekend Scout eval cases",
  "",
  `Every case starts from the real forecast for Saturday ${week.sat} and Sunday ${week.sun}, captured ${snapshot.capturedAt.slice(0, 16).replace("T", " ")} UTC, and changes only what its description says. Each case asks the Scout the same question: "Is this weekend worth a hike? If so, where should I go and which day?"`,
  "",
  "On top of each case's own checks, every answer is also checked for **made-up facts**: every claim must be backed by what the tools returned.",
  "",
  "| # | Case | Group | Passes if |",
  "|---|---|---|---|",
  ...cases.map((c, i) => `| ${i + 1} | \`${c.id}\` | ${c.tag} | ${describeExpect(c.expect).join("; ")} |`),
  "",
];

cases.forEach((c, i) => {
  const plans = buildPlans(snapshot, c);
  out.push(`## ${i + 1}. \`${c.id}\` (${c.tag})`, "", c.description, "", "**Passes if:**", "", ...describeExpect(c.expect).map((l) => `- ${l}`), "");
  if (c.secondOpinion) out.push("**Second opinion:** the Met Office tool has a forecast for this case (otherwise it says none is available).", "");
  out.push("**What the ranking tool shows (top 6 per day):**", "", "```");
  for (const date of [week.sat, week.sun]) {
    const plan = plans[date];
    out.push(formatRanking(date, rankDay(plan, undefined, 6, now)));
    if (plan.notices.length) out.push(`Notes: ${plan.notices.join(" ")}`);
    out.push("");
  }
  out.push("```", "");
});

writeFileSync("evals/scout/cases.md", out.join("\n"));
console.log(`Wrote ${cases.length} cases to evals/scout/cases.md`);
