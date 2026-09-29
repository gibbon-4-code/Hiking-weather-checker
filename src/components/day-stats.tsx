import { Droplets, Thermometer, Wind } from "lucide-react";
import type { DaySummary } from "@/lib/scoring";
import { cn } from "@/lib/utils";

export function DayStats({ summary, className }: { summary: DaySummary; className?: string }) {
  return (
    <dl className={cn("grid grid-cols-3 gap-2 text-xs", className)}>
      <Stat icon={<Droplets className="size-3.5 text-sky-600" />} label="Rain" value={`${summary.maxPrecipProb}%`} sub={`${summary.precipMm} mm`} />
      <Stat icon={<Wind className="size-3.5 text-slate-500" />} label="Gusts" value={`${summary.maxGustMph} mph`} sub={`wind ${summary.maxWindMph}`} />
      <Stat
        icon={<Thermometer className="size-3.5 text-orange-500" />}
        label="Summit"
        value={`${Math.round(summary.minTempC)}–${Math.round(summary.maxTempC)}°`}
        sub={`feels ${Math.round(summary.minFeelsLikeC)}°`}
      />
    </dl>
  );
}

function Stat({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub: string }) {
  return (
    <div className="rounded-lg bg-muted/60 px-2 py-1.5">
      <dt className="flex items-center gap-1 text-muted-foreground">
        {icon}
        {label}
      </dt>
      <dd className="mt-0.5 font-semibold tabular-nums text-foreground">{value}</dd>
      <dd className="text-[11px] text-muted-foreground tabular-nums">{sub}</dd>
    </div>
  );
}
