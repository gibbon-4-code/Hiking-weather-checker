import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { getViewer } from "@/auth";
import { MOUNTAINS } from "@/data/mountains";
import { liveSource } from "@/lib/agent/live-source";
import { runScout, weekend, type ScoutResult } from "@/lib/agent/scout";
import { authMode, env } from "@/lib/env";

/** The Scout usually answers in 10–20 seconds; allow for a retry and a slow weather API. */
export const maxDuration = 120;

/** Asking the Scout costs about 6 cents, so the same weekend's answer is reused for an hour. */
const CACHE_MS = 60 * 60 * 1000;
let cached: { key: string; at: number; body: ScoutResponse } | null = null;

export interface ScoutResponse {
  answer: ScoutResult["answer"];
  /** The picked hill's name and area, for display. Null for skip. */
  hill: { id: string; name: string; area: string } | null;
  /** What the app's own checks did: passed, or retried, downgraded or overruled Claude's pick, and why. */
  guardrail: { action: "passed" | "retried" | "downgraded" | "overruled"; reason: string | null };
  weekend: { saturday: string; sunday: string };
  askedAt: string;
}

/**
 * Runs the Weekend Scout agent for the coming weekend, from Brighton. POST, not GET: each run costs
 * money, so it should never be triggered by a prefetch or a crawler, only by someone pressing the button.
 */
export async function POST() {
  if (authMode === "misconfigured") {
    return NextResponse.json({ error: "Sign-in isn't configured on this deployment." }, { status: 503 });
  }
  if (!(await getViewer())) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }
  if (!env.anthropicKey) {
    return NextResponse.json({ error: "The Scout isn't set up here (no Anthropic API key)." }, { status: 503 });
  }

  const now = new Date();
  const { saturday, sunday } = weekend(now);
  const key = `${saturday}|${sunday}`;
  if (cached?.key === key && now.getTime() - cached.at < CACHE_MS) return NextResponse.json(cached.body);

  try {
    const result = await runScout(liveSource, new Anthropic({ apiKey: env.anthropicKey }));
    const mountain = MOUNTAINS.find((m) => m.id === result.answer.mountainId);
    const body: ScoutResponse = {
      answer: result.answer,
      hill: mountain ? { id: mountain.id, name: mountain.name, area: mountain.area } : null,
      guardrail: result.overruled
        ? { action: "overruled", reason: result.overruled }
        : result.downgraded
          ? { action: "downgraded", reason: result.downgraded }
          : result.retried
            ? { action: "retried", reason: result.retried }
            : { action: "passed", reason: null },
      weekend: { saturday, sunday },
      askedAt: now.toISOString(),
    };
    console.log(`Scout: ${body.answer.verdict} ${body.answer.mountainId ?? ""}, guardrail ${body.guardrail.action}, $${result.cost.toFixed(3)}`);
    // Don't keep an answer the Scout couldn't finish; let the next press try again.
    if (result.overruled !== "no usable answer") cached = { key, at: now.getTime(), body };
    return NextResponse.json(body);
  } catch (err) {
    console.error("Scout failed", err);
    return NextResponse.json({ error: "The Scout couldn't finish this time. Try again in a minute." }, { status: 502 });
  }
}
