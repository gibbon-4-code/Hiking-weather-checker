import { Car, Footprints, Mountain } from "lucide-react";
import { FactBlock } from "@/components/fact-block";
import { formatDuration } from "@/lib/dates";
import type { DestinationScore } from "@/lib/scoring";
import { cn } from "@/lib/utils";
import { walkParts } from "@/lib/walks";

/** The drive, the walk and the height: what the day out actually involves. */
export function TripFacts({
  score,
  size = "sm",
  tone = "light",
  className,
}: {
  score: DestinationScore;
  size?: "sm" | "lg";
  tone?: "light" | "dark";
  className?: string;
}) {
  const { mountain, drive } = score.destination;
  const walk = walkParts(mountain);
  const estimate = drive.method === "estimate";
  const dark = tone === "dark";
  const iconColor = dark ? "text-[#e8c46a]" : "text-moss";
  const quiet = dark ? "text-white/75" : "text-muted-foreground";

  if (size === "sm") {
    return (
      <p
        className={cn(
          "flex flex-wrap items-center gap-x-4 gap-y-1 text-[15px] font-semibold tabular-nums",
          dark ? "text-surface" : "text-bark",
          className,
        )}
      >
        <span className="flex items-center gap-1.5 whitespace-nowrap">
          <Car className={cn("size-4", iconColor)} aria-hidden="true" />
          {formatDuration(drive.minutes)}
          {estimate && <span title="Estimated drive time">≈</span>}
          <span className={cn("font-normal", quiet)}>drive</span>
        </span>
        <span className="flex items-center gap-1.5 whitespace-nowrap">
          <Footprints className={cn("size-4", iconColor)} aria-hidden="true" />
          {walk.time}
          <span className={cn("font-normal", quiet)}>walk{walk.distance && ` · ${walk.distance}`}</span>
        </span>
      </p>
    );
  }

  const tileClassName = dark ? "bg-white/10 text-[#e8c46a]" : "bg-moss/10 text-moss";
  return (
    <div className={cn("grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3", className)}>
      <FactBlock
        tone={tone}
        tile={<Car className="size-5" />}
        tileClassName={tileClassName}
        label="Drive"
        value={formatDuration(drive.minutes)}
        sub={score.needsOvernight ? "worth an overnight" : estimate ? "each way, estimated" : "each way"}
      />
      <FactBlock
        tone={tone}
        tile={<Footprints className="size-5" />}
        tileClassName={tileClassName}
        label="Walk"
        value={walk.time}
        sub={[walk.distance, mountain.difficulty.toLowerCase()].filter(Boolean).join(" · ")}
      />
      <FactBlock
        tone={tone}
        tile={<Mountain className="size-5" />}
        tileClassName={tileClassName}
        label="Height"
        value={`${mountain.summit.elevationM} m`}
        sub="at the summit"
      />
    </div>
  );
}
