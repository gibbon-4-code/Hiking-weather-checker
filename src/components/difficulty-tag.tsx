import type { Difficulty } from "@/lib/types";
import { cn } from "@/lib/utils";

const LIGHT: Record<Difficulty, string> = {
  Easy: "bg-moss/15 text-moss",
  Moderate: "bg-ochre/15 text-ochre",
  Hard: "bg-clay/15 text-clay",
};

export function DifficultyTag({ difficulty, tone = "light" }: { difficulty: Difficulty; tone?: "light" | "dark" }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-md px-2 py-0.5 text-xs font-semibold",
        tone === "dark" ? "bg-white/15 text-surface" : LIGHT[difficulty],
      )}
    >
      {difficulty}
    </span>
  );
}
