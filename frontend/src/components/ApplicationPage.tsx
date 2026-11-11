import { useEffect, useRef, useState } from "react";
import { ApiClientError, cancelHold, confirmHold, errorMessage, getHold } from "../api/client";
import type { Hold } from "../api/types";
import { useNotifications } from "../context/NotificationContext";
import { useStudentDialog } from "../context/StudentDialogContext";
import { useStudent } from "../context/StudentContext";
import { useCountdown } from "../hooks/useCountdown";
import { usePolling } from "../hooks/usePolling";
import { AdmissionLetter } from "./AdmissionLetter";
import { Crest } from "./brand/Crest";
import { IconAlert, IconArrowLeft, IconCopy, IconDocument } from "./brand/icons";
import { PageHeader } from "./layout/PageHeader";
import { LoadingBlock } from "./StateBlock";
import { StatusBadge } from "./StatusBadge";
import { Button } from "./ui/Button";
import { CountdownRing } from "./ui/CountdownRing";
import { StepTracker } from "./ui/StepTracker";

const POLL_MS = 3000;

const TERMINAL_TEXT = {
  CONFIRMED: "Your admission is confirmed. The seat is yours.",
  EXPIRED: "This application has expired because the fee was not paid in time. The seat was released.",
  CANCELLED: "This application was cancelled. The seat was released.",
} as const;

/** The line under the page title says what is true NOW, not what was true when the page opened. */
const LEAD = {
  HELD: "Pay the admission fee before the timer ends to confirm the place.",
  CONFIRMED: "The place is yours. Keep the reference below and print the admission letter for your records.",
  EXPIRED: "You can apply again at any time while places remain.",
  CANCELLED: "You can apply again at any time while places remain.",
} as const;

export function ApplicationPage({ holdId }: { holdId: string }) {
  const { studentId, isValid } = useStudent();
  const { openStudentId } = useStudentDialog();
  const { notifyError, notifyInfo } = useNotifications();

  const [hold, setHold] = useState<Hold | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [working, setWorking] = useState<"pay" | "cancel" | null>(null);
  const [showLetter, setShowLetter] = useState(false);

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

  async function copyReference() {
    try {
      await navigator.clipboard.writeText(holdId);
      notifyInfo("Application reference copied.");
    } catch {
      notifyInfo("Couldn't copy automatically. Select the reference and copy it by hand.");
    }
  }

  if (notFound)
    return (
      <section>
        <PageHeader title="Your reservation" />
        <div className="container page-body">
          <p className="strip strip-error" role="alert">{loadError}</p>
          <p><a className="arrow-link" href="#/mine"><IconArrowLeft size={16} /> Go to my applications</a></p>
        </div>
      </section>
    );

  if (!hold)
    return (
      <section>
        <PageHeader title="Your reservation" />
        <div className="container page-body">
          {loadError ? (
            <p className="strip strip-error" role="alert">{loadError} Trying again…</p>
          ) : (
            <LoadingBlock>Loading application…</LoadingBlock>
          )}
        </div>
      </section>
    );

  const until = new Date(hold.expiresAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <section>
      <PageHeader title="Your reservation" lead={status ? LEAD[status] : undefined} />

      <div className="container page-body">
        {loadError && (
          <p className="strip strip-warn" role="status" data-testid="refresh-error">
            Couldn't refresh this application, so what you see may be out of date. {loadError} Trying again…
          </p>
        )}

        <article className="res-card">
          <h2 className="res-class">{hold.className}</h2>

          {status && <StepTracker status={status} />}

          {status === "HELD" && (
            <div className="res-hold">
              <CountdownRing remainingMs={remaining} />
              <p className="res-until">Your place is reserved until {until}.</p>
              <p className="hint">Pay before the timer ends or the seat is released.</p>
            </div>
          )}

          {status && status !== "HELD" && (
            <div className={`res-state res-state-${status.toLowerCase()}`}>
              <span className="res-state-icon">{status === "CONFIRMED" ? <Crest size={58} /> : <IconAlert size={34} />}</span>
              <p role="status" data-testid="terminal-text">{TERMINAL_TEXT[status]}</p>
              {status !== "CONFIRMED" && <Button variant="outline" href="#/classes">Browse places</Button>}
            </div>
          )}

          <div className={status === "HELD" ? "actions" : "actions actions-quiet"}>
            <Button onClick={pay} disabled={!canAct}>
              {working === "pay" ? "Paying…" : "Pay admission fee"}
            </Button>
            <Button variant="outline" onClick={cancel} disabled={!canAct}>
              {working === "cancel" ? "Cancelling…" : "Cancel application"}
            </Button>
          </div>

          {status === "HELD" && !isValid && (
            <p className="hint">
              Enter your 17-digit birth registration number above to pay or cancel.{" "}
              <button type="button" className="text-link" onClick={openStudentId}>Enter student number</button>
            </p>
          )}
          {status === "HELD" && isValid && !isOwner && (
            <p className="hint">
              This application belongs to student {hold.studentId}. Enter that student's number above to pay or cancel.
            </p>
          )}

          <dl className="details">
            <dt>Student</dt>
            <dd className="tnum">{hold.studentId}</dd>
            <dt>Status</dt>
            <dd>{status && <StatusBadge status={status} />}</dd>
            <dt>Reference</dt>
            <dd className="reference">
              <code>{hold.holdId}</code>
              <button type="button" className="icon-btn" onClick={copyReference} aria-label="Copy reference">
                <IconCopy size={16} />
              </button>
            </dd>
          </dl>

          {status === "CONFIRMED" && (
            <div className="letter-open">
              <Button variant="outline" onClick={() => setShowLetter((s) => !s)}>
                <IconDocument size={18} /> {showLetter ? "Hide admission letter" : "Download admission letter"}
              </Button>
            </div>
          )}
        </article>

        {status === "CONFIRMED" && showLetter && <AdmissionLetter hold={hold} />}

        <p className="res-links">
          <a className="arrow-link" href="#/mine"><IconArrowLeft size={16} /> My applications</a>
          <a className="arrow-link" href="#/classes">Places &amp; Apply</a>
        </p>
      </div>
    </section>
  );
}
