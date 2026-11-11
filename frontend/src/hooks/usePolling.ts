import { useCallback, useEffect, useRef } from "react";

/**
 * Calls `callback` immediately and then every `intervalMs`.
 *  - never runs two calls at once (a slow server can't pile requests up);
 *  - pauses while the browser tab is hidden and refreshes as soon as it is visible again;
 *  - `refresh()` triggers an extra run now (queued if one is already in flight).
 * The callback must handle its own errors.
 */
export function usePolling(callback: () => Promise<void>, intervalMs: number, enabled = true) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  const running = useRef(false);
  const queued = useRef(false);

  const refresh = useCallback(async () => {
    if (running.current) {
      queued.current = true;   // run once more right after the current call, so the caller sees fresh data
      return;
    }
    running.current = true;
    try {
      do {
        queued.current = false;
        try {
          await callbackRef.current();
        } catch {
          // callbacks report their own errors; never let one break the loop
        }
      } while (queued.current);
    } finally {
      running.current = false;
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;

    void refresh();
    const timer = setInterval(() => {
      if (!document.hidden) void refresh();
    }, intervalMs);
    const onVisible = () => {
      if (!document.hidden) void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [enabled, intervalMs, refresh]);

  return { refresh };
}
