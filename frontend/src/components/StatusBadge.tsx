import type { HoldStatus } from "../api/types";

export function StatusBadge({ status }: { status: HoldStatus }) {
  return (
    <span className={`badge badge-${status.toLowerCase()}`} data-testid="status">
      {status}
    </span>
  );
}
