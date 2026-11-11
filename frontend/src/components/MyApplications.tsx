import { useRef, useState } from "react";
import { errorMessage, myHolds } from "../api/client";
import type { MyHold } from "../api/types";
import { useNotifications } from "../context/NotificationContext";
import { useStudentDialog } from "../context/StudentDialogContext";
import { useStudent } from "../context/StudentContext";
import { useNow } from "../hooks/useNow";
import { usePolling } from "../hooks/usePolling";
import { effectiveStatus, formatRemaining, remainingMs } from "../lib/hold";
import { PageHeader } from "./layout/PageHeader";
import { ApplicationsIcon, LoadingBlock, StateBlock } from "./StateBlock";
import { StatusBadge } from "./StatusBadge";

const POLL_MS = 3000;

export function MyApplications() {
  const { studentId, isValid } = useStudent();
  const { openStudentId } = useStudentDialog();
  const { notifyError, dismiss } = useNotifications();

  const [holds, setHolds] = useState<MyHold[] | null>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const failedBefore = useRef(false);
  const currentStudent = useRef(studentId);
  currentStudent.current = studentId;

  const now = useNow(500);

  usePolling(
    async () => {
      const asking = studentId;
      try {
        const result = await myHolds(asking);
        if (currentStudent.current !== asking) return;   // the user switched student while we waited
        setHolds(result);
        setRefreshError(null);
        if (failedBefore.current) dismiss();   // the "can't reach the server" banner is out of date now
        failedBefore.current = false;
      } catch (error) {
        if (currentStudent.current !== asking) return;
        setRefreshError(errorMessage(error));
        if (!failedBefore.current) notifyError(error);
        failedBefore.current = true;
      }
    },
    POLL_MS,
    isValid,
  );

  if (!isValid)
    return (
      <section>
        <PageHeader title="My Applications" lead="Every application for this student, and where each one stands." />
        <div className="container page-body">
          <p className="hint" data-testid="id-hint">
            Enter your birth registration number above to see your applications.{" "}
            <button type="button" className="text-link" onClick={openStudentId}>Enter student number</button>
          </p>
        </div>
      </section>
    );

  return (
    <section>
      <PageHeader title="My Applications" lead="Every application for this student, and where each one stands." />

      <div className="container page-body">
        {refreshError && (
          <p className="strip strip-warn" role="status" data-testid="refresh-error">
            Couldn't refresh your applications, so the list may be out of date. {refreshError} Trying again…
          </p>
        )}

        {holds === null && !refreshError && <LoadingBlock>Loading your applications…</LoadingBlock>}
        {holds?.length === 0 && (
          <StateBlock icon={ApplicationsIcon} testId="no-applications">
            You have no applications yet. <a href="#/classes">Browse classes</a> to apply.
          </StateBlock>
        )}

        {holds && holds.length > 0 && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Class</th>
                  <th>Status</th>
                  <th>Time remaining</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {holds.map((h) => {
                  const status = effectiveStatus(h.status, h.expiresAt, now);
                  return (
                    <tr key={h.holdId} data-testid={`application-${h.holdId}`}>
                      <td><span className="class-name">{h.className}</span></td>
                      <td data-label="Status"><StatusBadge status={status} /></td>
                      <td data-label="Time remaining" className="tnum">
                        {status === "HELD" ? formatRemaining(remainingMs(h.expiresAt, now)) : "—"}
                      </td>
                      <td><a className="row-link" href={`#/applications/${encodeURIComponent(h.holdId)}`}>Open</a></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
