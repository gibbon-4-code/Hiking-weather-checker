"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CircleCheck, CircleSlash, Clock, LoaderCircle, ShieldCheck, Sparkles } from "lucide-react";
import type { ScoutResponse } from "@/app/api/scout/route";
import { primaryButton } from "@/components/results/best-bet";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatDayName } from "@/lib/dates";
import { cn } from "@/lib/utils";

type State = { status: "idle" } | { status: "asking" } | { status: "error"; message: string } | { status: "done"; data: ScoutResponse };

const VERDICT = {
  go: { label: "Worth going", icon: CircleCheck, tone: "bg-moss/10 text-moss ring-moss/30" },
  wait: { label: "Check again nearer the day", icon: Clock, tone: "bg-[#e8c46a]/20 text-[#7a5a12] ring-[#c9a24a]/40" },
  skip: { label: "Give it a miss", icon: CircleSlash, tone: "bg-clay/10 text-clay-deep ring-clay/30" },
} as const;

const GUARDRAIL_NOTE = {
  passed: "The app checked this pick against its own safety rules.",
  retried: "The app rejected the Scout's first pick and it chose again",
  downgraded: "The app changed the Scout's “go” to “wait”",
  overruled: "The app overruled the Scout's pick",
} as const;

/** "Ask the Weekend Scout": runs the AI agent for this weekend and shows its answer. */
export function ScoutButton({ className }: { className?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<State>({ status: "idle" });

  async function ask() {
    setOpen(true);
    if (state.status === "asking" || state.status === "done") return;
    setState({ status: "asking" });
    try {
      const res = await fetch("/api/scout", { method: "POST" });
      if (res.status === 401) {
        router.replace("/signin");
        return;
      }
      // The host replies with its own plain-text error page if the server stops before answering.
      const text = await res.text();
      let body: { error?: string } & Partial<ScoutResponse>;
      try {
        body = JSON.parse(text);
      } catch {
        const code = text.match(/[A-Z_]{8,}/)?.[0];
        throw new Error(
          `The server stopped before the Scout could answer (${res.status}${code ? `, ${code}` : ""}). ` +
            "It may have run out of time. Try again in a minute.",
        );
      }
      if (!res.ok) throw new Error(body.error ?? `Request failed (${res.status})`);
      setState({ status: "done", data: body as ScoutResponse });
    } catch (err) {
      setState({ status: "error", message: err instanceof Error ? err.message : String(err) });
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={ask}
        className={cn(
          "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-white ring-1 ring-inset ring-white/40 transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white",
          className,
        )}
      >
        <Sparkles className="size-4" aria-hidden="true" />
        Not sure? Ask the Weekend Scout
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90svh] overflow-y-auto text-left sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">The Weekend Scout</DialogTitle>
            <DialogDescription>
              An AI agent that checks this weekend&apos;s forecasts for hills within reach of Brighton, then
              recommends where and when to go.
            </DialogDescription>
          </DialogHeader>
          <ScoutBody
            state={state}
            onRetry={() => {
              setState({ status: "idle" });
              void ask();
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

function ScoutBody({ state, onRetry }: { state: State; onRetry: () => void }) {
  if (state.status === "idle" || state.status === "asking") {
    return (
      <div className="flex items-center gap-3 rounded-xl bg-sand px-4 py-5 text-pine" role="status">
        <LoaderCircle className="size-5 animate-spin" aria-hidden="true" />
        <p>Checking Saturday and Sunday across every hill. This takes about 15 seconds.</p>
      </div>
    );
  }
  if (state.status === "error") {
    return (
      <div className="space-y-3 rounded-xl bg-clay/10 px-4 py-4 text-clay-deep" role="alert">
        <p>{state.message}</p>
        <button type="button" onClick={onRetry} className="font-semibold underline underline-offset-2">
          Try again
        </button>
      </div>
    );
  }

  const { answer, hill, guardrail } = state.data;
  const verdict = VERDICT[answer.verdict];
  const Icon = verdict.icon;
  return (
    <div className="space-y-4">
      <div className={cn("inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold ring-1 ring-inset", verdict.tone)}>
        <Icon className="size-4" aria-hidden="true" />
        {verdict.label}
      </div>

      {hill && answer.date && (
        <p className="font-display text-2xl font-bold text-pine">
          {hill.name}
          <span className="block text-base font-semibold text-moss">
            {hill.area} · {formatDayName(answer.date)}
          </span>
        </p>
      )}

      <p className="text-base text-pine">{answer.headline}</p>
      <ul className="list-disc space-y-1.5 pl-5 text-pine/90">
        {answer.reasons.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>

      <p className="flex items-start gap-2 text-xs text-pine/70">
        <ShieldCheck className="mt-px size-4 shrink-0" aria-hidden="true" />
        <span>
          {GUARDRAIL_NOTE[guardrail.action]}
          {guardrail.reason ? ` (${guardrail.reason}).` : ""} Confidence: {answer.confidence}. The Scout is a planning
          aid: check the mountain forecast and make your own call on the day.
        </span>
      </p>

      {hill && answer.date && (
        <Link href={`/results?${new URLSearchParams({ from: "Brighton", date: answer.date })}`} className={primaryButton}>
          See {formatDayName(answer.date, "short")}&apos;s full forecast
        </Link>
      )}
    </div>
  );
}
