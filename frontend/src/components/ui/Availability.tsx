import type { SchoolClass } from "../../api/types";
import { availability } from "../../lib/availability";

type Counts = Pick<SchoolClass, "totalSeats" | "heldSeats" | "confirmedSeats" | "availableSeats">;

/** A thin bar of seats in use. Decorative: it carries no text, the numbers beside it say the same. */
export function AvailabilityBar({ c }: { c: Counts }) {
  const { level, usedPercent } = availability(c);
  return (
    <span className={`avail-bar avail-${level}`} aria-hidden="true">
      <i style={{ width: `${usedPercent}%` }} />
    </span>
  );
}

/** "Places available", "Filling fast", "Last few places" or "Full". */
export function AvailabilityBadge({ c }: { c: Counts }) {
  const { level, label } = availability(c);
  return <span className={`avail-badge avail-${level}`}>{label}</span>;
}
