import type { SchoolClass } from "../api/types";

export type AvailabilityLevel = "available" | "filling" | "last" | "full";

export interface Availability {
  level: AvailabilityLevel;
  label: string;
  /** Share of seats taken (held + confirmed), 0 to 100. */
  usedPercent: number;
}

type Counts = Pick<SchoolClass, "totalSeats" | "heldSeats" | "confirmedSeats" | "availableSeats">;

/** How full a class is, in words a guardian understands. */
export function availability(c: Counts): Availability {
  const total = Math.max(c.totalSeats, 1);
  const usedPercent = Math.min(100, Math.round(((c.heldSeats + c.confirmedSeats) / total) * 100));

  if (c.availableSeats <= 0) return { level: "full", label: "Full", usedPercent };
  if (c.availableSeats <= 5) return { level: "last", label: "Last few places", usedPercent };
  if (c.availableSeats / total <= 0.3) return { level: "filling", label: "Filling fast", usedPercent };
  return { level: "available", label: "Places available", usedPercent };
}

/** The four numbers on Home. */
export function summarize(classes: SchoolClass[]) {
  return classes.reduce(
    (sum, c) => ({
      classes: sum.classes + 1,
      totalPlaces: sum.totalPlaces + c.totalSeats,
      placesAvailable: sum.placesAvailable + c.availableSeats,
      confirmed: sum.confirmed + c.confirmedSeats,
    }),
    { classes: 0, totalPlaces: 0, placesAvailable: 0, confirmed: 0 },
  );
}
