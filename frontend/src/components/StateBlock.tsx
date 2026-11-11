import type { ReactNode } from "react";

/** A centered, intentional panel for empty states — never leftover stray text. */
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

export const ClassesIcon = (
  <svg viewBox="0 0 24 24" fill="none">
    <rect x="3.5" y="4.5" width="17" height="15" rx="2.2" stroke="currentColor" strokeWidth="1.6" />
    <path d="M8 9h8M8 12.5h8M8 16h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

export const ApplicationsIcon = (
  <svg viewBox="0 0 24 24" fill="none">
    <path
      d="M6 3.5h7.5L19 9v10.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 19.5V5A1.5 1.5 0 0 1 6 3.5Z"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
    />
    <path d="M13 3.6V9h5.4" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
  </svg>
);
