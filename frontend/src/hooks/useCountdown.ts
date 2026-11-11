import { serverNow } from "../api/client";
import { remainingMs } from "../lib/hold";
import { useNow } from "./useNow";

/**
 * Milliseconds until `expiresAt` by the server's clock.
 * The ticker only makes the component re-render twice a second; the time itself is read fresh,
 * so a hold that has just arrived never shows a second too many.
 */
export function useCountdown(expiresAt: string | undefined): number {
  useNow(500);
  return expiresAt ? remainingMs(expiresAt, serverNow()) : 0;
}
