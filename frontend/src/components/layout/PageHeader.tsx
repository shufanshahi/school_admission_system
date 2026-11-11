import type { ReactNode } from "react";

/** The title band at the top of every inner page. Each page has exactly one h1. */
export function PageHeader({ title, lead }: { title: string; lead?: ReactNode }) {
  return (
    <div className="page-head">
      <div className="container">
        <h1>{title}</h1>
        {lead && <p className="lead">{lead}</p>}
      </div>
    </div>
  );
}
