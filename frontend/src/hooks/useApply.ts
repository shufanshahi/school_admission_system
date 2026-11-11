import { useCallback, useState } from "react";
import { ApiClientError, applyForSeat } from "../api/client";
import type { SchoolClass } from "../api/types";
import { useNotifications } from "../context/NotificationContext";
import { useStudentDialog } from "../context/StudentDialogContext";
import { useStudent } from "../context/StudentContext";
import { goToApplication } from "./useHashRoute";

/** "Apply" for a class: used by the places board and the live places on Home. */
export function useApply(onFailed?: () => void) {
  const { studentId, isValid } = useStudent();
  const { openStudentId } = useStudentDialog();
  const { notifyError } = useNotifications();
  const [applyingTo, setApplyingTo] = useState<string | null>(null);

  /** No valid number yet: say so, say where to type it, and take the user to the field. */
  const askForStudentId = useCallback(() => {
    const onThisPage = !!document.getElementById("student-id");   // true on Home, where the field is part of the page
    const have = studentId.length;
    const problem = have === 0
      ? "Please enter the student's 17-digit birth registration number first."
      : `The birth registration number must be exactly 17 digits (you have entered ${have}).`;
    const where = onThisPage
      ? "Type it in the Admissions Portal box, then press Apply again."
      : "Type it in the \"Student ID\" box that has just opened at the top right, then press Apply again.";
    notifyError(new ApiClientError("INVALID_STUDENT_ID", `${problem} ${where}`));
    openStudentId();
  }, [studentId, notifyError, openStudentId]);

  const apply = useCallback(
    async (classId: string) => {
      if (!isValid) {
        askForStudentId();
        return;
      }
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
    [studentId, isValid, askForStudentId, notifyError, onFailed],
  );

  // Not blocked by a missing student number: pressing Apply then explains what to do (see askForStudentId).
  const canApply = (c: SchoolClass) => c.availableSeats > 0 && applyingTo === null;

  const tooltip = (c: SchoolClass): string | undefined => {
    if (c.availableSeats === 0) return "No seats are left in this class";
    return undefined;
  };

  const label = (c: SchoolClass) => (applyingTo === c.id ? "Applying…" : c.availableSeats === 0 ? "Full" : "Apply");

  return { apply, applyingTo, canApply, tooltip, label };
}
