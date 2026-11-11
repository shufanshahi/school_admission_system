import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { errorMessage } from "../api/client";

export interface Notice {
  id: number;
  kind: "error" | "info";
  text: string;
}

interface NotificationContextValue {
  notice: Notice | null;
  /** Show any thrown value as a readable error. */
  notifyError: (error: unknown) => void;
  notifyInfo: (text: string) => void;
  dismiss: () => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);
let nextId = 1;

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notice, setNotice] = useState<Notice | null>(null);

  const notifyError = useCallback((error: unknown) => {
    setNotice({ id: nextId++, kind: "error", text: errorMessage(error) });
  }, []);
  const notifyInfo = useCallback((text: string) => setNotice({ id: nextId++, kind: "info", text }), []);
  const dismiss = useCallback(() => setNotice(null), []);

  // Good news fades by itself; errors stay until the user dismisses them or something new happens.
  useEffect(() => {
    if (notice?.kind !== "info") return;
    const timer = setTimeout(() => setNotice((n) => (n?.id === notice.id ? null : n)), 6000);
    return () => clearTimeout(timer);
  }, [notice]);

  const value = useMemo(() => ({ notice, notifyError, notifyInfo, dismiss }), [notice, notifyError, notifyInfo, dismiss]);
  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications(): NotificationContextValue {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used inside <NotificationProvider>");
  return ctx;
}
