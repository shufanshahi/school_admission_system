import { useCallback, useState } from "react";
import { applyForSeat } from "../api/client";
import type { SchoolClass } from "../api/types";
import { useNotifications } from "../context/NotificationContext";
import { useStudent } from "../context/StudentContext";
import { goToApplication } from "./useHashRoute";

/** "Apply" for a class: used by the places board and the live places on Home. */
export function useApply(onFailed?: () => void) {
  const { studentId, isValid } = useStudent();
  const { notifyError } = useNotifications();
  const [applyingTo, setApplyingTo] = useState<string | null>(null);

  const apply = useCallback(
    async (classId: string) => {
      setApplyingTo(classId);
      try {
        const hold = await applyForSeat(classId, studentId);
        goToApplication(hold.holdId);
      } catch (error) {
        notifyError(error);
        onFailed?.();   // the seat counts probably changed
      } finally {
        setApplyingTo(null);
      }
    },
    [studentId, notifyError, onFailed],
  );

  const canApply = (c: SchoolClass) => isValid && c.availableSeats > 0 && applyingTo === null;

  const tooltip = (c: SchoolClass): string | undefined => {
    if (!isValid) return "Enter your 17-digit birth registration number first";
    if (c.availableSeats === 0) return "No seats are left in this class";
    return undefined;
  };

  const label = (c: SchoolClass) => (applyingTo === c.id ? "Applying…" : c.availableSeats === 0 ? "Full" : "Apply");

  return { apply, applyingTo, canApply, tooltip, label };
}
