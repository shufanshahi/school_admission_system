import { useEffect, useRef, useState } from "react";
import { ApiClientError, cancelHold, confirmHold, errorMessage, getHold } from "../api/client";
import type { Hold } from "../api/types";
import { useNotifications } from "../context/NotificationContext";
import { useStudent } from "../context/StudentContext";
import { useCountdown } from "../hooks/useCountdown";
import { usePolling } from "../hooks/usePolling";
import { formatRemaining } from "../lib/hold";
import { StatusBadge } from "./StatusBadge";

const POLL_MS = 3000;

const TERMINAL_TEXT = {
  CONFIRMED: "Your admission is confirmed. The seat is yours.",
  EXPIRED: "This application has expired because the fee was not paid in time. The seat was released.",
  CANCELLED: "This application was cancelled. The seat was released.",
} as const;

export function ApplicationPage({ holdId }: { holdId: string }) {
  const { studentId, isValid } = useStudent();
  const { notifyError, notifyInfo } = useNotifications();

  const [hold, setHold] = useState<Hold | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [working, setWorking] = useState<"pay" | "cancel" | null>(null);

  const { refresh } = usePolling(async () => {
    try {
      setHold(await getHold(holdId));
      setLoadError(null);
      setNotFound(false);
    } catch (error) {
      if (error instanceof ApiClientError && error.code === "HOLD_NOT_FOUND") setNotFound(true);
      setLoadError(errorMessage(error));
    }
  }, POLL_MS);

  // The timer follows the server's clock; the status shown follows the timer.
  const remaining = useCountdown(hold?.expiresAt);
  const status = hold ? (hold.status === "HELD" && remaining <= 0 ? "EXPIRED" : hold.status) : null;

  // The moment the timer hits zero, ask the server once so what we show matches what it says.
  const syncedFor = useRef<string | null>(null);
  useEffect(() => {
    if (hold && hold.status === "HELD" && remaining <= 0 && syncedFor.current !== hold.expiresAt) {
      syncedFor.current = hold.expiresAt;
      void refresh();
    }
  }, [hold, remaining, refresh]);

  const isOwner = !!hold && isValid && hold.studentId === studentId;
  const canAct = status === "HELD" && isOwner && working === null;

  async function pay() {
    setWorking("pay");
    try {
      await confirmHold(holdId, studentId);
      notifyInfo("Payment received. Your admission is confirmed.");
    } catch (error) {
      notifyError(error);
    } finally {
      setWorking(null);
      void refresh();
    }
  }

  async function cancel() {
    if (!window.confirm("Cancel this application? Your seat will be released.")) return;
    setWorking("cancel");
    try {
      await cancelHold(holdId, studentId);
      notifyInfo("Application cancelled. The seat was released.");
    } catch (error) {
      notifyError(error);
    } finally {
      setWorking(null);
      void refresh();
    }
  }

  if (notFound)
    return (
      <section>
        <h2>Application</h2>
        <p className="notice notice-error" role="alert">{loadError}</p>
        <p><a href="#/mine">Go to my applications</a></p>
      </section>
    );

  if (!hold)
    return (
      <section>
        <h2>Application</h2>
        {loadError ? (
          <p className="notice notice-error" role="alert">{loadError} Trying again…</p>
        ) : (
          <p>Loading application…</p>
        )}
      </section>
    );

  return (
    <section>
      <h2>Application</h2>

      {loadError && (
        <p className="notice notice-warn" role="status" data-testid="refresh-error">
          Couldn't refresh this application, so what you see may be out of date. {loadError} Trying again…
        </p>
      )}

      <dl className="details">
        <dt>Class</dt>
        <dd>{hold.className}</dd>
        <dt>Student</dt>
        <dd className="id-value">{hold.studentId}</dd>
        <dt>Status</dt>
        <dd>{status && <StatusBadge status={status} />}</dd>
      </dl>

      {status === "HELD" && (
        <div className="hold-timer">
          <span className="hold-timer-label">Time remaining</span>
          <span className="countdown" data-testid="countdown">{formatRemaining(remaining)}</span>
          <span className="hint">Pay before the timer ends or the seat is released.</span>
        </div>
      )}

      {status && status !== "HELD" && (
        <p className={status === "CONFIRMED" ? "success" : "notice notice-warn"} role="status" data-testid="terminal-text">
          {TERMINAL_TEXT[status]}
        </p>
      )}

      <div className="actions">
        <button type="button" onClick={pay} disabled={!canAct}>
          {working === "pay" ? "Paying…" : "Pay admission fee"}
        </button>
        <button type="button" className="secondary" onClick={cancel} disabled={!canAct}>
          {working === "cancel" ? "Cancelling…" : "Cancel application"}
        </button>
      </div>

      {status === "HELD" && !isValid && (
        <p className="hint">Enter your 17-digit birth registration number above to pay or cancel.</p>
      )}
      {status === "HELD" && isValid && !isOwner && (
        <p className="hint">
          This application belongs to student {hold.studentId}. Enter that student's number above to pay or cancel.
        </p>
      )}

      <p><a href="#/mine">← My applications</a> · <a href="#/classes">Class list</a></p>
    </section>
  );
}

