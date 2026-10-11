import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { getViewer } from "@/auth";
import { MOUNTAINS } from "@/data/mountains";
import { liveSource } from "@/lib/agent/live-source";
import { runScout, weekend, type ScoutResult } from "@/lib/agent/scout";
import { authMode, env } from "@/lib/env";

/** The Scout usually answers in 10–20 seconds; allow for a retry and a slow weather API. */
export const maxDuration = 120;
/** Give up a little before `maxDuration`, so the reply is a clear message rather than the host's error page. */
const DEADLINE_MS = 100_000;

class DeadlineError extends Error {}

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

  const started = Date.now();
  const elapsed = () => `${((Date.now() - started) / 1000).toFixed(1)}s`;
  let deadline: ReturnType<typeof setTimeout> | undefined;
  try {
    // Stop waiting before the host's own limit, so the reply is always ours (and says what happened).
    const result = await Promise.race([
      runScout(liveSource, new Anthropic({ apiKey: env.anthropicKey, timeout: DEADLINE_MS }), (step) =>
        console.log(`Scout ${elapsed()}: turn ${step.turn} asked for ${step.toolCalls.map((t) => t.name).join(", ")}`),
      ),
      new Promise<never>((_, reject) => {
        deadline = setTimeout(() => reject(new DeadlineError()), DEADLINE_MS);
      }),
    ]);
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
    console.log(`Scout ${elapsed()}: ${body.answer.verdict} ${body.answer.mountainId ?? ""}, guardrail ${body.guardrail.action}, $${result.cost.toFixed(3)}`);
    // Don't keep an answer the Scout couldn't finish; let the next press try again.
    if (result.overruled !== "no usable answer") cached = { key, at: now.getTime(), body };
    return NextResponse.json(body);
  } catch (err) {
    console.error(`Scout failed after ${elapsed()}`, err);
    return NextResponse.json({ error: explainFailure(err) }, { status: 502 });
  } finally {
    clearTimeout(deadline);
  }
}

/**
 * A plain-English reason the Scout failed, so whoever is signed in can tell a fixable setup problem
 * (a bad key, no credit) from a passing one. Anthropic's error messages never contain the key itself.
 */
function explainFailure(err: unknown): string {
  if (err instanceof DeadlineError || err instanceof Anthropic.APIConnectionTimeoutError) {
    return "The Scout took too long (over 100 seconds) and gave up. Try again in a minute.";
  }
  if (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.PermissionDeniedError) {
    return "Anthropic rejected the API key. Check ANTHROPIC_API_KEY in the hosting settings (just the key, no quotes or spaces), then redeploy.";
  }
  if (err instanceof Anthropic.RateLimitError) {
    return "The Scout is being rate-limited by Anthropic. Try again in a minute.";
  }
  if (err instanceof Anthropic.BadRequestError && /credit/i.test(err.message)) {
    return "The Anthropic account is out of API credit. Top it up in the Anthropic Console, then try again.";
  }
  if (err instanceof Anthropic.InternalServerError || err instanceof Anthropic.APIConnectionError) {
    return "Anthropic is busy or unreachable right now. Try again in a minute.";
  }
  if (err instanceof Anthropic.APIError) {
    return `The Scout couldn't finish: Anthropic returned an error (${err.status ?? "no status"}). Try again in a minute.`;
  }
  return "The Scout couldn't finish this time. Try again in a minute.";
}
