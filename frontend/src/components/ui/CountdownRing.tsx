import { useRef } from "react";
import { formatRemaining } from "../../lib/hold";

const RADIUS = 88;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * The time left on a held place, as a ring that empties. The digits carry the real information
 * (and the test id); the ring is the at-a-glance view. Gold, then amber in the last minute.
 */
export function CountdownRing({ remainingMs }: { remainingMs: number }) {
  // The full length is the longest time we have seen on this screen. (The hold length is a server setting.)
  const longest = useRef(remainingMs);
  if (remainingMs > longest.current) longest.current = remainingMs;

  const fraction = longest.current > 0 ? Math.max(0, Math.min(1, remainingMs / longest.current)) : 0;
  const urgent = remainingMs <= 60_000;

  return (
    <div className={urgent ? "ring ring-urgent" : "ring"}>
      <svg viewBox="0 0 200 200" aria-hidden="true" focusable="false">
        <circle className="ring-track" cx="100" cy="100" r={RADIUS} />
        <circle
          className="ring-value"
          cx="100"
          cy="100"
          r={RADIUS}
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - fraction)}
          transform="rotate(-90 100 100)"
        />
      </svg>
      <div className="ring-center">
        <span className="countdown" data-testid="countdown">{formatRemaining(remainingMs)}</span>
        <span className="ring-caption">remaining</span>
      </div>
    </div>
  );
}
