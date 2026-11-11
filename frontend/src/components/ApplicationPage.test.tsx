import { act, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import type { Hold } from "../api/types";
import { isoIn, json, mockBackend, OTHER_ID, renderWithProviders, VALID_ID } from "../test/utils";
import { ApplicationPage } from "./ApplicationPage";

const hold = (over: Partial<Hold> = {}): Hold => ({
  holdId: "h_1", classId: "c_1", className: "Class 6 - Morning Shift", studentId: VALID_ID,
  status: "HELD", expiresAt: isoIn(600_000), ...over,
});
const pay = () => screen.getByRole("button", { name: "Pay admission fee" });
const cancel = () => screen.getByRole("button", { name: "Cancel application" });

describe("ApplicationPage", () => {
  test("shows the status and a countdown while the seat is held", async () => {
    mockBackend({ "GET /holds/h_1": () => json(200, hold({ expiresAt: isoIn(90_000) })) });
    renderWithProviders(<ApplicationPage holdId="h_1" />, { studentId: VALID_ID });

    expect(await screen.findByTestId("status")).toHaveTextContent("HELD");
    expect(screen.getByTestId("countdown").textContent).toMatch(/^01:(29|30)$/);
    expect(pay()).toBeEnabled();
    expect(cancel()).toBeEnabled();
  });

  test("when the time runs out it shows EXPIRED and disables Pay, with no reload", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const expiresAt = isoIn(3_000);
    // the server still says HELD: the screen must flip on its own when the timer hits zero
    mockBackend({ "GET /holds/h_1": () => json(200, hold({ expiresAt })) });
    renderWithProviders(<ApplicationPage holdId="h_1" />, { studentId: VALID_ID });
    expect(await screen.findByTestId("status")).toHaveTextContent("HELD");

    await act(async () => { await vi.advanceTimersByTimeAsync(3_600); });

    expect(screen.getByTestId("status")).toHaveTextContent("EXPIRED");
    expect(screen.queryByTestId("countdown")).not.toBeInTheDocument();
    expect(pay()).toBeDisabled();
    expect(cancel()).toBeDisabled();
    expect(screen.getByTestId("terminal-text")).toHaveTextContent(/expired/);
  });

  test("Pay confirms the admission", async () => {
    let status: Hold["status"] = "HELD";
    const fetchMock = mockBackend({
      "GET /holds/h_1": () => json(200, hold({ status })),
      "POST /holds/h_1/confirm": () => { status = "CONFIRMED"; return json(200, { holdId: "h_1", status }); },
    });
    renderWithProviders(<ApplicationPage holdId="h_1" />, { studentId: VALID_ID });

    await userEvent.click(await screen.findByRole("button", { name: "Pay admission fee" }));

    await waitFor(() => expect(screen.getByTestId("status")).toHaveTextContent("CONFIRMED"));
    expect(screen.getByText("Payment received. Your admission is confirmed.")).toBeInTheDocument();
    expect(pay()).toBeDisabled();
    expect(fetchMock.mock.calls.filter(([url]) => String(url).endsWith("/confirm"))).toHaveLength(1);
  });

  test("a too-late payment shows the server's reason in plain words", async () => {
    mockBackend({
      "GET /holds/h_1": () => json(200, hold()),
      "POST /holds/h_1/confirm": () => json(409, { error: "HOLD_EXPIRED", message: "x" }),
    });
    renderWithProviders(<ApplicationPage holdId="h_1" />, { studentId: VALID_ID });

    await userEvent.click(await screen.findByRole("button", { name: "Pay admission fee" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Your hold has expired. Please apply again.");
  });

  test("Cancel asks first, then releases the seat", async () => {
    let status: Hold["status"] = "HELD";
    mockBackend({
      "GET /holds/h_1": () => json(200, hold({ status })),
      "DELETE /holds/h_1": () => { status = "CANCELLED"; return json(204, null); },
    });
    const confirmSpy = vi.fn(() => true);
    vi.stubGlobal("confirm", confirmSpy);
    renderWithProviders(<ApplicationPage holdId="h_1" />, { studentId: VALID_ID });

    await userEvent.click(await screen.findByRole("button", { name: "Cancel application" }));

    expect(confirmSpy).toHaveBeenCalledOnce();
    await waitFor(() => expect(screen.getByTestId("status")).toHaveTextContent("CANCELLED"));
  });

  test("someone else's application cannot be paid from here", async () => {
    mockBackend({ "GET /holds/h_1": () => json(200, hold({ studentId: OTHER_ID })) });
    renderWithProviders(<ApplicationPage holdId="h_1" />, { studentId: VALID_ID });

    await screen.findByTestId("status");
    expect(pay()).toBeDisabled();
    expect(screen.getByText(/belongs to student/)).toBeInTheDocument();
  });

  test("an unknown application shows a friendly message", async () => {
    mockBackend({ "GET /holds/h_nope": () => json(404, { error: "HOLD_NOT_FOUND", message: "x" }) });
    renderWithProviders(<ApplicationPage holdId="h_nope" />, { studentId: VALID_ID });
    expect(await screen.findByRole("alert")).toHaveTextContent("We couldn't find that application.");
  });
});
