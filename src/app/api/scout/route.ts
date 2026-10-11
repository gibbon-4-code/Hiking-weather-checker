import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { getViewer } from "@/auth";
import { MOUNTAINS } from "@/data/mountains";
import { liveSource } from "@/lib/agent/live-source";
import { z } from "zod";
import { searchBrief, weekendBrief, type ScoutBrief } from "@/lib/agent/brief";
import { runScout, type ScoutResult } from "@/lib/agent/scout";
import { isPlannableDate } from "@/lib/dates";
import { resolveHome } from "@/lib/home";
import { LocationError } from "@/lib/providers/location";
import { DEFAULT_PREFERENCES } from "@/lib/scoring";
import { authMode, env } from "@/lib/env";

/** The Scout usually answers in 10–20 seconds; allow for a retry and a slow weather API. */
export const maxDuration = 120;
/** Give up a little before `maxDuration`, so the reply is a clear message rather than the host's error page. */
const DEADLINE_MS = 100_000;

class DeadlineError extends Error {}

/** Asking the Scout costs about 6 cents, so the same question's answer is reused for an hour. */
const CACHE_MS = 60 * 60 * 1000;
const CACHE_SIZE = 50;
const cache = new Map<string, { at: number; body: ScoutResponse }>();

/** What the results page sends: the search the person ran, and their scoring weights from Settings. */
const requestSchema = z.object({
  from: z.string().trim().min(1).max(100),
  date: z.string(),
  maxDriveMinutes: z.number().int().positive().max(24 * 60).nullable(),
  walk: z.enum(["short", "half", "full"]).nullable(),
  weights: z
    .object({ weather: z.number().min(0).max(100), travel: z.number().min(0).max(100), quality: z.number().min(0).max(100) })
    .optional(),
});

export interface ScoutResponse {
  answer: ScoutResult["answer"];
  /** The picked hill's name and area, for display. Null for skip. */
  hill: { id: string; name: string; area: string } | null;
  /** What the app's own checks did: passed, or retried, downgraded or overruled Claude's pick, and why. */
  guardrail: { action: "passed" | "retried" | "downgraded" | "overruled"; reason: string | null };
  /** Where the Scout set off from, and the days it was allowed to pick. */
  home: string;
  days: string[];
  askedAt: string;
}

/**
 * Runs the Scout agent on someone's search: their starting point, day and filters. With no body it
 * answers the original question, this weekend from Brighton. POST, not GET: each run costs money,
 * so it should never be triggered by a prefetch or a crawler, only by someone pressing the button.
 */
export async function POST(request: Request) {
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
  const text = await request.text();
  let brief: ScoutBrief;
  if (!text.trim()) {
    brief = weekendBrief(now);
  } else {
    let parsed;
    try {
      parsed = requestSchema.safeParse(JSON.parse(text));
    } catch {
      parsed = null;
    }
    if (!parsed?.success) return NextResponse.json({ error: "That search doesn't look right." }, { status: 400 });
    const search = parsed.data;
    if (!isPlannableDate(search.date, now)) {
      return NextResponse.json({ error: "Pick a day between today and two weeks from now." }, { status: 400 });
    }
    let home;
    try {
      home = await resolveHome(search.from);
    } catch (err) {
      if (err instanceof LocationError) return NextResponse.json({ error: err.message }, { status: 400 });
      return NextResponse.json({ error: "Couldn't look up that place right now." }, { status: 502 });
    }
    const prefs = { weights: search.weights ?? DEFAULT_PREFERENCES.weights, maxDriveMinutes: search.maxDriveMinutes, walk: search.walk };
    brief = searchBrief(home, prefs, search.date, now);
  }

  const key = JSON.stringify({ kind: brief.kind, home: [brief.home.lat, brief.home.lon], prefs: brief.prefs, days: brief.days });
  const hit = cache.get(key);
  if (hit && now.getTime() - hit.at < CACHE_MS) return NextResponse.json(hit.body);

  const started = Date.now();
  const elapsed = () => `${((Date.now() - started) / 1000).toFixed(1)}s`;
  let deadline: ReturnType<typeof setTimeout> | undefined;
  try {
    // Stop waiting before the host's own limit, so the reply is always ours (and says what happened).
    const result = await Promise.race([
      runScout(liveSource(brief.home), new Anthropic({ apiKey: env.anthropicKey, timeout: DEADLINE_MS }), (step) =>
        console.log(`Scout ${elapsed()}: turn ${step.turn} asked for ${step.toolCalls.map((t) => t.name).join(", ")}`),
        brief,
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
      home: brief.home.label,
      days: brief.days,
      askedAt: now.toISOString(),
    };
    console.log(`Scout ${elapsed()}: ${body.answer.verdict} ${body.answer.mountainId ?? ""}, guardrail ${body.guardrail.action}, $${result.cost.toFixed(3)}`);
    // Don't keep an answer the Scout couldn't finish; let the next press try again.
    if (result.overruled !== "no usable answer") {
      if (cache.size >= CACHE_SIZE) cache.delete(cache.keys().next().value!);
      cache.set(key, { at: now.getTime(), body });
    }
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
