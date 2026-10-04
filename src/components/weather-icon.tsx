import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudRainWind,
  CloudSnow,
  CloudSun,
  Snowflake,
  Sun,
  type LucideProps,
} from "lucide-react";
import { CONDITION_LABEL } from "@/lib/providers/conditions";
import type { Condition } from "@/lib/types";
import { cn } from "@/lib/utils";

const ICONS: Record<Condition, React.ComponentType<LucideProps>> = {
  clear: Sun,
  "partly-cloudy": CloudSun,
  cloudy: Cloud,
  fog: CloudFog,
  drizzle: CloudDrizzle,
  rain: CloudRain,
  "heavy-rain": CloudRainWind,
  sleet: CloudSnow,
  snow: Snowflake,
  "heavy-snow": CloudSnow,
  thunder: CloudLightning,
};

const TINT: Record<Condition, string> = {
  clear: "text-ochre",
  "partly-cloudy": "text-ochre",
  cloudy: "text-muted-foreground",
  fog: "text-muted-foreground",
  drizzle: "text-lake",
  rain: "text-lake",
  "heavy-rain": "text-lake",
  sleet: "text-lake",
  snow: "text-lake",
  "heavy-snow": "text-lake",
  thunder: "text-clay",
};

/** Lighter tints that read on photos and dark panels. */
const TINT_DARK: Record<Condition, string> = {
  clear: "text-[#e8c46a]",
  "partly-cloudy": "text-[#e8c46a]",
  cloudy: "text-white/80",
  fog: "text-white/80",
  drizzle: "text-[#a9c7da]",
  rain: "text-[#a9c7da]",
  "heavy-rain": "text-[#a9c7da]",
  sleet: "text-[#a9c7da]",
  snow: "text-white",
  "heavy-snow": "text-white",
  thunder: "text-[#f0a184]",
};

export function WeatherIcon({
  condition,
  className,
  tone = "light",
}: {
  condition: Condition;
  className?: string;
  tone?: "light" | "dark";
}) {
  const Icon = ICONS[condition];
  return (
    <Icon
      aria-label={CONDITION_LABEL[condition]}
      strokeWidth={1.9}
      className={cn("shrink-0", (tone === "dark" ? TINT_DARK : TINT)[condition], className)}
    />
  );
}
