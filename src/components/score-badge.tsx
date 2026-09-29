import { scoreTone } from "@/lib/scoring";
import { cn } from "@/lib/utils";

const TONES = {
  great: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  good: "bg-lime-100 text-lime-800 ring-lime-200",
  mixed: "bg-amber-100 text-amber-800 ring-amber-200",
  poor: "bg-rose-100 text-rose-800 ring-rose-200",
};

export function ScoreBadge({ score, size = "sm", className }: { score: number; size?: "sm" | "lg"; className?: string }) {
  return (
    <span
      title="Hiking score out of 100"
      className={cn(
        "inline-flex items-center justify-center rounded-full font-semibold tabular-nums ring-1",
        size === "lg" ? "size-16 text-2xl" : "h-6 min-w-9 px-2 text-xs",
        TONES[scoreTone(score)],
        className,
      )}
    >
      {score}
    </span>
  );
}
