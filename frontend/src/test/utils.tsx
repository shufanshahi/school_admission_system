import { render } from "@testing-library/react";
import type { ReactElement } from "react";
import { vi } from "vitest";
import { NoticeBanner } from "../components/NoticeBanner";
import { NotificationProvider } from "../context/NotificationContext";
import { StudentProvider } from "../context/StudentContext";

export const VALID_ID = "20152691234567890";
export const OTHER_ID = "20152691234567891";

/** Renders a screen the way the app does: inside the providers, with the message banner. */
export function renderWithProviders(ui: ReactElement, { studentId }: { studentId?: string } = {}) {
  if (studentId !== undefined) localStorage.setItem("school-admission.studentId", studentId);
  return render(
    <StudentProvider>
      <NotificationProvider>
        <NoticeBanner />
        {ui}
      </NotificationProvider>
    </StudentProvider>,
  );
}

export function json(status: number, body: unknown, headers: Record<string, string> = {}): Response {
  return new Response(status === 204 ? null : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

type Handler = (request: { method: string; path: string; headers: Record<string, string>; body: unknown }) =>
  Response | Promise<Response>;

/**
 * Replaces fetch with a fake backend. `routes` maps "METHOD /path" (path may end with *) to a handler.
 * Returns the mock so tests can inspect the calls.
 */
export function mockBackend(routes: Record<string, Handler>) {
  const mock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    const method = (init?.method ?? "GET").toUpperCase();
    const key = `${method} ${url.pathname}`;
    const match = Object.entries(routes).find(([pattern]) =>
      pattern.endsWith("*") ? key.startsWith(pattern.slice(0, -1)) : key === pattern,
    );
    if (!match) throw new Error(`Unexpected request in test: ${key}`);
    return match[1]({
      method,
      path: url.pathname,
      headers: (init?.headers ?? {}) as Record<string, string>,
      body: init?.body ? JSON.parse(String(init.body)) : undefined,
    });
  });
  vi.stubGlobal("fetch", mock);
  return mock;
}

/** fetch that fails the way it does when the server is down. */
export function backendDown() {
  vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("Failed to fetch"); }));
}

export const isoIn = (ms: number) => new Date(Date.now() + ms).toISOString();
