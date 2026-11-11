export type HoldStatus = "HELD" | "CONFIRMED" | "EXPIRED" | "CANCELLED";

/** A class (one shift) with live seat counts. */
export interface SchoolClass {
  id: string;
  name: string;
  totalSeats: number;
  heldSeats: number;
  confirmedSeats: number;
  availableSeats: number;
}

/** Response of POST /classes. */
export interface CreatedClass {
  id: string;
  name: string;
  totalSeats: number;
}

/** Response of POST /classes/{id}/holds. */
export interface CreatedHold {
  holdId: string;
  classId: string;
  studentId: string;
  status: HoldStatus;
  expiresAt: string;
}

/** Response of GET /holds/{id}. */
export interface Hold {
  holdId: string;
  classId: string;
  className: string;
  studentId: string;
  status: HoldStatus;
  expiresAt: string;
}

/** One row of GET /me/holds. */
export interface MyHold {
  holdId: string;
  classId: string;
  className: string;
  status: HoldStatus;
  expiresAt: string;
}
