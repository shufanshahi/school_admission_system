import { useNotifications } from "../context/NotificationContext";
import { IconAlert, IconCheck, IconClose } from "./brand/icons";

/** The one place action errors and confirmations are shown: a toast in the top right. */
export function NoticeBanner() {
  const { notice, dismiss } = useNotifications();
  if (!notice) return null;

  return (
    <div className="toast-region">
      <div
        className={`notice notice-${notice.kind}`}
        role={notice.kind === "error" ? "alert" : "status"}
        data-testid="notice"
      >
        <span className="notice-icon">{notice.kind === "error" ? <IconAlert size={20} /> : <IconCheck size={20} />}</span>
        <span className="notice-text">{notice.text}</span>
        <button type="button" className="icon-btn" onClick={dismiss} aria-label="Dismiss message">
          <IconClose size={16} />
        </button>
      </div>
    </div>
  );
}
