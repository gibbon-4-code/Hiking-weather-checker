"use client";

import { useSyncExternalStore } from "react";
import { DEFAULT_PREFERENCES, type Preferences } from "@/lib/scoring";

export interface Settings extends Preferences {
  /** Where the drive starts: a UK postcode or a town name. */
  from: string;
}

// Still named after the old "Weekend Summits" app: renaming it would wipe everyone's saved settings.
const KEY = "weekend-summits:settings";
export const DEFAULT_SETTINGS: Settings = { ...DEFAULT_PREFERENCES, from: "Brighton" };

const listeners = new Set<() => void>();
let cachedRaw: string | null = null;
let cached: Settings = DEFAULT_SETTINGS;

function read(): Settings {
  const raw = window.localStorage.getItem(KEY);
  if (raw === cachedRaw) return cached;
  cachedRaw = raw;
  try {
    // Older versions saved the starting point as "postcode".
    const { postcode, ...parsed } = raw ? (JSON.parse(raw) as Partial<Settings> & { postcode?: string }) : {};
    cached = {
      ...DEFAULT_SETTINGS,
      ...(postcode ? { from: postcode } : {}),
      ...parsed,
      weights: { ...DEFAULT_SETTINGS.weights, ...parsed.weights },
    };
  } catch {
    cached = DEFAULT_SETTINGS;
  }
  return cached;
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

export function saveSettings(next: Settings) {
  window.localStorage.setItem(KEY, JSON.stringify(next));
  listeners.forEach((l) => l());
}

/** Settings live in the browser only; there is no database behind this app. */
export function useSettings() {
  return useSyncExternalStore(subscribe, read, () => DEFAULT_SETTINGS);
}
