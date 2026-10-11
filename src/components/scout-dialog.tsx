"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CircleCheck, CircleSlash, Clock, LoaderCircle, ShieldCheck, Sparkles } from "lucide-react";
import type { ScoutResponse } from "@/app/api/scout/route";
import { primaryButton, secondaryButton } from "@/components/results/best-bet";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatDayName } from "@/lib/dates";
import type { Weights } from "@/lib/scoring";
import { searchQuery, type Search } from "@/lib/search";
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

/**
 * "Ask the Scout": runs the AI agent on the search the person just ran (their starting point, day,
 * drive limit, walk length and scoring weights) and shows its answer.
 */
export function ScoutButton({
  search,
  weights,
  onShowHill,
  className,
}: {
  search: Search;
  weights: Weights;
  /** Opens a hill's details on the results page. */
  onShowHill: (id: string) => void;
  className?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<State>({ status: "idle" });

  async function ask() {
    setOpen(true);
    if (state.status === "asking" || state.status === "done") return;
    setState({ status: "asking" });
    try {
      const res = await fetch("/api/scout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...search, weights }),
      });
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
      <button type="button" onClick={ask} className={cn(secondaryButton, className)}>
        <Sparkles className="size-4" aria-hidden="true" />
        Ask the Scout about this search
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90svh] overflow-y-auto text-left sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">The Scout</DialogTitle>
            <DialogDescription>
              An AI agent that reads the forecasts for your search and recommends where to go, checking the day
              either side too.
            </DialogDescription>
          </DialogHeader>
          <ScoutBody
            state={state}
            search={search}
            onRetry={() => {
              setState({ status: "idle" });
              void ask();
            }}
            onShowHill={(id) => {
              setOpen(false);
              onShowHill(id);
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

function ScoutBody({
  state,
  search,
  onRetry,
  onShowHill,
}: {
  state: State;
  search: Search;
  onRetry: () => void;
  onShowHill: (id: string) => void;
}) {
  if (state.status === "idle" || state.status === "asking") {
    return (
      <div className="flex items-center gap-3 rounded-xl bg-sand px-4 py-5 text-pine" role="status">
        <LoaderCircle className="size-5 animate-spin" aria-hidden="true" />
        <p>
          Checking {formatDayName(search.date)} from {search.from}, and the days either side. This takes about 15
          seconds.
        </p>
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

      {hill && answer.date === search.date && (
        <button type="button" onClick={() => onShowHill(hill.id)} className={primaryButton}>
          Show {hill.name}
        </button>
      )}
      {hill && answer.date && answer.date !== search.date && (
        <Link href={`/results?${searchQuery({ ...search, date: answer.date })}`} className={primaryButton}>
          See {formatDayName(answer.date, "short")}&apos;s results
        </Link>
      )}
    </div>
  );
}
