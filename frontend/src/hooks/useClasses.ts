import { useRef, useState } from "react";
import { errorMessage, listClasses } from "../api/client";
import type { SchoolClass } from "../api/types";
import { useNotifications } from "../context/NotificationContext";
import { usePolling } from "./usePolling";

const POLL_MS = 3000;

/** The live class list, refreshed every few seconds. Keeps the last numbers when a refresh fails. */
export function useClasses() {
  const { notifyError, dismiss } = useNotifications();
  const [classes, setClasses] = useState<SchoolClass[] | null>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);
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

  return { classes, refreshError, refresh };
}
