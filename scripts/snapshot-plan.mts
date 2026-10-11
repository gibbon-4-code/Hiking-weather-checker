/**
 * Freezes this weekend's real plans (forecasts and drive times for every hill) to disk, so the
 * Scout's evals run on known data instead of live weather.
 *
 *   npm run eval:snapshot
 *
 * Writes evals/scout/snapshot.json. No API key needed, and no Claude cost.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { weekend } from "@/lib/agent/scout";
import { buildPlan } from "@/lib/plan";

const now = new Date();
const { saturday, sunday } = weekend(now);
const plans = { [saturday]: await buildPlan(saturday), [sunday]: await buildPlan(sunday) };

const demo = Object.values(plans).flatMap((p) => p.destinations.filter((d) => d.forecast.source === "demo"));
if (demo.length) {
  console.error(`${demo.length} forecasts are demo data (the weather API may be rate-limiting). Try again later.`);
  process.exit(1);
}

mkdirSync("evals/scout", { recursive: true });
writeFileSync("evals/scout/snapshot.json", JSON.stringify({ capturedAt: now.toISOString(), plans }));
console.log(`Saved ${saturday} and ${sunday} (${Object.values(plans)[0].destinations.length} hills each) to evals/scout/snapshot.json`);
