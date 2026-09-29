import { formatClock } from "@/lib/dates";
import type { Slot } from "@/lib/types";

const W = 320;
const H = 120;
const PAD = { top: 10, right: 8, bottom: 20, left: 8 };

/** Rain chance as bars, summit gusts as a line, so a good weather window stands out at a glance. */
export function HourlyChart({ slots }: { slots: Slot[] }) {
  if (slots.length < 2) return null;
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const step = innerW / slots.length;
  const gustMax = Math.max(50, ...slots.map((s) => s.gustMph));
  const x = (i: number) => PAD.left + i * step + step / 2;
  const yRain = (p: number) => PAD.top + innerH - (p / 100) * innerH;
  const yGust = (g: number) => PAD.top + innerH - (g / gustMax) * innerH;
  const labelEvery = Math.ceil(slots.length / 6);

  const gustPath = slots.map((s, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${yGust(s.gustMph).toFixed(1)}`).join(" ");
  const dangerY = yGust(50);

  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Chance of rain and summit gusts through the day">
        <line x1={PAD.left} x2={W - PAD.right} y1={dangerY} y2={dangerY} className="stroke-rose-300" strokeDasharray="3 3" />
        <text x={W - PAD.right} y={dangerY - 3} textAnchor="end" className="fill-rose-500 text-[8px]">
          50 mph gusts
        </text>
        {slots.map((s, i) => (
          <rect
            key={s.time}
            x={x(i) - step * 0.35}
            width={step * 0.7}
            y={yRain(s.precipProb)}
            height={Math.max(0, PAD.top + innerH - yRain(s.precipProb))}
            rx={1.5}
            className="fill-sky-300/70"
          />
        ))}
        <path d={gustPath} fill="none" className="stroke-slate-700" strokeWidth={1.5} strokeLinejoin="round" />
        {slots.map((s, i) =>
          i % labelEvery === 0 ? (
            <text key={s.time} x={x(i)} y={H - 6} textAnchor="middle" className="fill-muted-foreground text-[8px]">
              {formatClock(s.time)}
            </text>
          ) : null,
        )}
      </svg>
      <figcaption className="mt-1 flex gap-4 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="inline-block size-2 rounded-sm bg-sky-300" /> Chance of rain
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-0.5 w-3 bg-slate-700" /> Gusts (mph)
        </span>
      </figcaption>
    </figure>
  );
}
