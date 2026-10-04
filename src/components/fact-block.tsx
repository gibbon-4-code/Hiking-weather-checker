import { cn } from "@/lib/utils";

/**
 * Shared anatomy for the headline facts (drive, walk, weather) so they line up:
 * 48px tile · xs label · 3xl display value · sm supporting line.
 */
export function FactBlock({
  tile,
  tileClassName,
  label,
  value,
  sub,
  tone = "light",
  srLabel,
  className,
}: {
  tile: React.ReactNode;
  tileClassName: string;
  label: string;
  value: React.ReactNode;
  sub: React.ReactNode;
  tone?: "light" | "dark";
  srLabel?: string;
  className?: string;
}) {
  const dark = tone === "dark";
  return (
    <div className={cn("flex min-w-0 items-center gap-3.5", className)}>
      <span className={cn("flex size-12 shrink-0 items-center justify-center rounded-xl", tileClassName)} aria-hidden="true">
        {tile}
      </span>
      <div className="min-w-0">
        <p className={cn("text-xs font-medium", dark ? "text-white/75" : "text-muted-foreground")}>{label}</p>
        <p className={cn("mt-1 whitespace-nowrap font-display text-3xl font-extrabold leading-none tabular-nums", dark ? "text-surface" : "text-bark")}>
          {srLabel && <span className="sr-only">{srLabel}. </span>}
          <span aria-hidden={srLabel ? true : undefined}>{value}</span>
        </p>
        <p className={cn("mt-1.5 flex items-center gap-1.5 text-sm", dark ? "text-white/80" : "text-muted-foreground")}>{sub}</p>
      </div>
    </div>
  );
}
