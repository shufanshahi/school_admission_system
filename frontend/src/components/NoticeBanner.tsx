import { useNotifications } from "../context/NotificationContext";

/** The one place action errors and confirmations are shown. */
export function NoticeBanner() {
  const { notice, dismiss } = useNotifications();
  if (!notice) return null;

  return (
    <div
      className={`notice notice-${notice.kind}`}
      role={notice.kind === "error" ? "alert" : "status"}
      data-testid="notice"
    >
      <span>{notice.text}</span>
      <button type="button" className="link-button" onClick={dismiss} aria-label="Dismiss message">
        ✕
      </button>
    </div>
  );
}
