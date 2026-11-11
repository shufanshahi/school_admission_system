import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";

beforeEach(() => {
  localStorage.clear();
  window.location.hash = "";
});

afterEach(() => {
  cleanup();               // unmount rendered components (stops their timers and polling)
  vi.unstubAllGlobals();   // restore the real fetch / confirm
  vi.useRealTimers();
});
