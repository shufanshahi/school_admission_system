import { remainingMs } from "../lib/hold";
import { useNow } from "./useNow";

/** Milliseconds until `expiresAt` by the server's clock, updated twice a second. */
export function useCountdown(expiresAt: string | undefined): number {
  const now = useNow(500);
  return expiresAt ? remainingMs(expiresAt, now) : 0;
}
