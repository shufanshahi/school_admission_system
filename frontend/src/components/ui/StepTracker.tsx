import type { HoldStatus } from "../../api/types";
import { IconCheck } from "../brand/icons";

const STEPS = ["Applied", "Reserved", "Paid", "Confirmed"] as const;

/** How far an application has got. Applied and Reserved always happen; Paid and Confirmed come together. */
function progress(status: HoldStatus): { done: number; stopped: boolean } {
  switch (status) {
    case "HELD": return { done: 1, stopped: false };        // applied; reserved is the current step
    case "CONFIRMED": return { done: 4, stopped: false };
    default: return { done: 2, stopped: true };             // reserved, then it ended unpaid
  }
}

export function StepTracker({ status }: { status: HoldStatus }) {
  const { done, stopped } = progress(status);
  return (
    <ol className="steps" aria-label="Progress">
      {STEPS.map((label, i) => {
        const state = i < done ? "done" : i === done && !stopped ? "current" : "todo";
        return (
          <li key={label} className={`step step-${state}`} aria-current={state === "current" ? "step" : undefined}>
            <span className="step-dot">{state === "done" ? <IconCheck size={14} /> : i + 1}</span>
            <span className="step-label">{label}</span>
          </li>
        );
      })}
    </ol>
  );
}
