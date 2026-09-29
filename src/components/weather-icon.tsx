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
  clear: "text-amber-500",
  "partly-cloudy": "text-amber-500",
  cloudy: "text-slate-500",
  fog: "text-slate-400",
  drizzle: "text-sky-500",
  rain: "text-sky-600",
  "heavy-rain": "text-blue-700",
  sleet: "text-cyan-600",
  snow: "text-cyan-500",
  "heavy-snow": "text-cyan-700",
  thunder: "text-violet-600",
};

export function WeatherIcon({ condition, className }: { condition: Condition; className?: string }) {
  const Icon = ICONS[condition];
  return <Icon aria-label={CONDITION_LABEL[condition]} className={cn(TINT[condition], className)} />;
}
