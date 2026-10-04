import { cn } from "@/lib/utils";

const SIZES = {
  sm: "h-7 min-w-7 px-2 text-xs",
  md: "h-9 min-w-9 px-2.5 text-sm",
  lg: "size-14 text-xl",
};

/** The 0–100 hill score: green when it's a good day, ochre when it's middling, clay when it's poor. */
export function ScoreBadge({
  score,
  size = "sm",
  inverted = false,
  className,
}: {
  score: number;
  size?: keyof typeof SIZES;
  /** Light badge for use on photos and dark panels. */
  inverted?: boolean;
  className?: string;
}) {
  const tone = inverted
    ? "bg-surface text-pine"
    : score >= 75
      ? "bg-moss text-surface"
      : score >= 55
        ? "bg-ochre text-surface"
        : "bg-clay text-surface";
  return (
    <span
      title="Hill score out of 100"
      aria-label={`Hill score ${score} out of 100`}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-bold tabular-nums",
        SIZES[size],
        tone,
        className,
      )}
    >
      {score}
    </span>
  );
}
