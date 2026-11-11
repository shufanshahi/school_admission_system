import { useEffect, useState } from "react";
import { serverNow } from "../api/client";

/** The current time on the SERVER's clock, re-rendering every `intervalMs`. */
export function useNow(intervalMs = 500): number {
  const [now, setNow] = useState(() => serverNow());
  useEffect(() => {
    const timer = setInterval(() => setNow(serverNow()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}
