"use client";

import { useSyncExternalStore } from "react";

/**
 * A tiny reactive clock. Date math like "X days until renewal" should never
 * call Date.now() during render (React treats it as impure), so components
 * read the current time through this hook instead. It ticks once a minute.
 */
let cachedNow = Date.now();
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return cachedNow;
}

function getServerSnapshot() {
  return cachedNow;
}

if (typeof window !== "undefined") {
  window.setInterval(() => {
    cachedNow = Date.now();
    for (const l of listeners) l();
  }, 60_000);
}

export function useNow(): number {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
