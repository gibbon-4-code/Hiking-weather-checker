"use client";

import { useSyncExternalStore } from "react";
import { BRIGHTON } from "@/data/mountains";
import { DEFAULT_PREFERENCES, type Preferences } from "@/lib/scoring";

export interface Settings extends Preferences {
  postcode: string;
}

const KEY = "weekend-summits:settings";
export const DEFAULT_SETTINGS: Settings = { ...DEFAULT_PREFERENCES, postcode: BRIGHTON.postcode ?? "BN1 1AA" };

const listeners = new Set<() => void>();
let cachedRaw: string | null = null;
let cached: Settings = DEFAULT_SETTINGS;

function read(): Settings {
  const raw = window.localStorage.getItem(KEY);
  if (raw === cachedRaw) return cached;
  cachedRaw = raw;
  try {
    const parsed = raw ? (JSON.parse(raw) as Partial<Settings>) : {};
    cached = {
      ...DEFAULT_SETTINGS,
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
