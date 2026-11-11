import type { ReactNode } from "react";
import { IconBuilding, IconDocument } from "./brand/icons";

/** A centred, intentional panel for empty states: never leftover stray text. */
export function StateBlock({
  icon,
  testId,
  children,
}: {
  icon: ReactNode;
  testId?: string;
  children: ReactNode;
}) {
  return (
    <div className="state-block" data-testid={testId}>
      <span className="state-icon" aria-hidden="true">
        {icon}
      </span>
      <div className="state-text">{children}</div>
    </div>
  );
}

/** The same panel for in-flight loads, announced politely to assistive tech. */
export function LoadingBlock({ children }: { children: ReactNode }) {
  return (
    <div className="state-block" role="status">
      <span className="state-dot" aria-hidden="true" />
      <div className="state-text">{children}</div>
    </div>
  );
}

export const ClassesIcon = <IconBuilding size={24} />;
export const ApplicationsIcon = <IconDocument size={24} />;
