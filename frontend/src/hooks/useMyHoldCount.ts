import { useState } from "react";
import { myHolds } from "../api/client";
import { useStudent } from "../context/StudentContext";
import { usePolling } from "./usePolling";

/** How many applications the current student has (null until known). Quiet: a failure just shows no number. */
export function useMyHoldCount(): number | null {
  const { studentId, isValid } = useStudent();
  const [count, setCount] = useState<{ forStudent: string; value: number } | null>(null);

  usePolling(
    async () => {
      try {
        const holds = await myHolds(studentId);
        setCount({ forStudent: studentId, value: holds.length });
      } catch {
        setCount(null);
      }
    },
    5000,
    isValid,
  );

  return isValid && count?.forStudent === studentId ? count.value : null;
}
