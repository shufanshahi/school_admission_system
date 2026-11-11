import type { HoldStatus } from "../api/types";

/** The birth registration number: exactly 17 ASCII digits. */
export const STUDENT_ID_PATTERN = /^[0-9]{17}$/;
export const isValidStudentId = (value: string): boolean => STUDENT_ID_PATTERN.test(value);

/** Milliseconds left until `expiresAt` (negative once it has passed). */
export function remainingMs(expiresAt: string, nowMs: number): number {
  return Date.parse(expiresAt) - nowMs;
}

/**
 * What to SHOW for an application. The server marks holds EXPIRED a moment after they time out,
 * but the screen must flip the instant the timer reaches zero, so a HELD hold past its
 * expiry time is displayed as EXPIRED.
 */
export function effectiveStatus(status: HoldStatus, expiresAt: string, nowMs: number): HoldStatus {
  return status === "HELD" && remainingMs(expiresAt, nowMs) <= 0 ? "EXPIRED" : status;
}

/** 90_000 -> "01:30". Never negative. */
export function formatRemaining(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
