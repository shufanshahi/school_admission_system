import { useRef, useState } from "react";
import { applyForSeat, errorMessage, listClasses } from "../api/client";
import type { SchoolClass } from "../api/types";
import { useNotifications } from "../context/NotificationContext";
import { useStudent } from "../context/StudentContext";
import { goToApplication } from "../hooks/useHashRoute";
import { usePolling } from "../hooks/usePolling";
import { ClassesIcon, LoadingBlock, StateBlock } from "./StateBlock";

const POLL_MS = 3000;

export function ClassList() {
  const { studentId, isValid } = useStudent();
  const { notifyError, dismiss } = useNotifications();

  const [classes, setClasses] = useState<SchoolClass[] | null>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [applyingTo, setApplyingTo] = useState<string | null>(null);
  const failedBefore = useRef(false);

  const { refresh } = usePolling(async () => {
    try {
      setClasses(await listClasses());
      setRefreshError(null);
      if (failedBefore.current) dismiss();   // the "can't reach the server" banner is out of date now
      failedBefore.current = false;
    } catch (error) {
      // Keep showing the last numbers; say plainly that they may be out of date.
      setRefreshError(errorMessage(error));
      if (!failedBefore.current) notifyError(error);   // tell the user once, not every 3 seconds
      failedBefore.current = true;
    }
  }, POLL_MS);

  async function apply(classId: string) {
    setApplyingTo(classId);
    try {
      const hold = await applyForSeat(classId, studentId);
      goToApplication(hold.holdId);
    } catch (error) {
      notifyError(error);
      void refresh();   // the seat counts probably changed
    } finally {
      setApplyingTo(null);
    }
  }

  function applyTooltip(c: SchoolClass): string | undefined {
    if (!isValid) return "Enter your 17-digit birth registration number first";
    if (c.availableSeats === 0) return "No seats are left in this class";
    return undefined;
  }

  return (
    <section>
      <h2>Classes</h2>
      {!isValid && (
        <p className="hint" data-testid="id-hint">
          Enter your 17-digit birth registration number at the top of the page to apply.
        </p>
      )}

      {refreshError && (
        <p className="notice notice-warn" role="status" data-testid="refresh-error">
          Couldn't refresh seat counts, so the numbers below may be out of date. {refreshError} Trying again…
        </p>
      )}

      {classes === null && !refreshError && <LoadingBlock>Loading classes…</LoadingBlock>}
      {classes === null && refreshError && <p>No class information to show yet.</p>}
      {classes?.length === 0 && (
        <StateBlock icon={ClassesIcon} testId="no-classes">
          No classes yet. An admin can add one in “Create class”.
        </StateBlock>
      )}

      {classes && classes.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Class</th>
                <th className="num">Total</th>
                <th className="num">Held</th>
                <th className="num">Confirmed</th>
                <th className="num">Available</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {classes.map((c) => (
                <tr key={c.id} data-testid={`class-row-${c.name}`} data-full={c.availableSeats === 0}>
                  <td>{c.name}</td>
                  <td className="num" data-label="Total">{c.totalSeats}</td>
                  <td className="num" data-label="Held" data-testid="held">{c.heldSeats}</td>
                  <td className="num" data-label="Confirmed" data-testid="confirmed">{c.confirmedSeats}</td>
                  <td className="num" data-label="Available" data-testid="available"><strong>{c.availableSeats}</strong></td>
                  <td>
                    <button
                      type="button"
                      onClick={() => apply(c.id)}
                      disabled={!isValid || c.availableSeats === 0 || applyingTo !== null}
                      title={applyTooltip(c)}
                    >
                      {applyingTo === c.id ? "Applying…" : c.availableSeats === 0 ? "Full" : "Apply"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
