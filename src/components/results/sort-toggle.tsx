import { cn } from "@/lib/utils";

export type SortKey = "score" | "drive" | "walk";

const OPTIONS: { key: SortKey; label: string }[] = [
  { key: "score", label: "Best conditions" },
  { key: "drive", label: "Shortest drive" },
  { key: "walk", label: "Shortest walk" },
];

export function SortToggle({ value, onChange }: { value: SortKey; onChange: (value: SortKey) => void }) {
  return (
    <div role="radiogroup" aria-label="Sort hills" className="flex rounded-xl bg-dune/40 p-1 text-sm">
      {OPTIONS.map((o) => (
        <button
          key={o.key}
          type="button"
          role="radio"
          aria-checked={value === o.key}
          onClick={() => onChange(o.key)}
          className={cn(
            "whitespace-nowrap rounded-lg px-3 py-1.5 font-medium transition-colors",
            value === o.key ? "bg-surface text-pine shadow-sm" : "text-muted-foreground hover:text-bark",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
