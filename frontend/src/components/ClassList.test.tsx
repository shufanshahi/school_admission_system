import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test } from "vitest";
import type { SchoolClass } from "../api/types";
import { backendDown, isoIn, json, mockBackend, renderWithProviders, VALID_ID } from "../test/utils";
import { ClassList } from "./ClassList";

const morning: SchoolClass = { id: "c_1", name: "Class 6 - Morning Shift", totalSeats: 120, heldSeats: 15, confirmedSeats: 80, availableSeats: 25 };
const full: SchoolClass = { id: "c_2", name: "Class 6 - Day Shift", totalSeats: 2, heldSeats: 1, confirmedSeats: 1, availableSeats: 0 };
const row = (name: string) => screen.getByText(name).closest("tr") as HTMLElement;

describe("ClassList", () => {
  test("shows total, held, confirmed and available for each class", async () => {
    mockBackend({ "GET /classes": () => json(200, [morning]) });
    renderWithProviders(<ClassList />, { studentId: VALID_ID });

    await screen.findByText(morning.name);
    const cells = within(row(morning.name)).getAllByRole("cell").map((c) => c.textContent);
    expect(cells.slice(0, 5)).toEqual(["Class 6 - Morning Shift", "120", "15", "80", "25"]);
  });

  test("Apply is disabled for a full class", async () => {
    mockBackend({ "GET /classes": () => json(200, [morning, full]) });
    renderWithProviders(<ClassList />, { studentId: VALID_ID });

    await screen.findByText(full.name);
    expect(within(row(full.name)).getByRole("button", { name: "Full" })).toBeDisabled();
    expect(within(row(morning.name)).getByRole("button", { name: "Apply" })).toBeEnabled();
  });

  test("pressing Apply without a student number explains what to enter and where, and sends nothing", async () => {
    const fetchMock = mockBackend({ "GET /classes": () => json(200, [morning]) });
    renderWithProviders(<ClassList />);

    const button = within(row((await screen.findByText(morning.name)).textContent!)).getByRole("button", { name: "Apply" });
    expect(button).toBeEnabled();   // not greyed out: pressing it is how the user learns what to do
    await userEvent.click(button);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Please enter the student's 17-digit birth registration number first.");
    expect(alert).toHaveTextContent('"Student ID" box');   // says where
    expect(fetchMock.mock.calls.some(([, init]) => (init as RequestInit)?.method === "POST")).toBe(false);
  });

  test("a half-typed number is told how many digits it has", async () => {
    mockBackend({ "GET /classes": () => json(200, [morning]) });
    renderWithProviders(<ClassList />, { studentId: "2015269" });

    await userEvent.click(await screen.findByRole("button", { name: "Apply" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("must be exactly 17 digits (you have entered 7)");
  });

  test("applying sends the student id and opens the application screen", async () => {
    const fetchMock = mockBackend({
      "GET /classes": () => json(200, [morning]),
      "POST /classes/c_1/holds": () =>
        json(201, { holdId: "h_9", classId: "c_1", studentId: VALID_ID, status: "HELD", expiresAt: isoIn(600_000) }),
    });
    renderWithProviders(<ClassList />, { studentId: VALID_ID });

    await userEvent.click(await screen.findByRole("button", { name: "Apply" }));

    await waitFor(() => expect(window.location.hash).toBe("#/applications/h_9"));
    const post = fetchMock.mock.calls.find(([, init]) => (init as RequestInit)?.method === "POST")!;
    expect(((post[1] as RequestInit).headers as Record<string, string>)["X-Student-Id"]).toBe(VALID_ID);
  });

  test("a rejected application shows the reason in plain words", async () => {
    mockBackend({
      "GET /classes": () => json(200, [morning]),
      "POST /classes/c_1/holds": () => json(409, { error: "NO_SEATS_AVAILABLE", message: "x" }),
    });
    renderWithProviders(<ClassList />, { studentId: VALID_ID });

    await userEvent.click(await screen.findByRole("button", { name: "Apply" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("No seats are left in this class.");
  });

  test("server down: a readable message instead of a blank list", async () => {
    backendDown();
    renderWithProviders(<ClassList />);
    expect(await screen.findByTestId("refresh-error")).toHaveTextContent(/Can't reach the server/);
    expect(screen.getByRole("alert")).toHaveTextContent(/Can't reach the server/);
  });

  test("seat counts refresh by themselves", async () => {
    let held = 15;
    mockBackend({ "GET /classes": () => json(200, [{ ...morning, heldSeats: held, availableSeats: 105 - held }]) });
    renderWithProviders(<ClassList />, { studentId: VALID_ID });
    await screen.findByText(morning.name);
    expect(within(row(morning.name)).getByTestId("held")).toHaveTextContent("15");

    held = 16;   // someone else applies; no click, no reload
    await waitFor(() => expect(within(row(morning.name)).getByTestId("held")).toHaveTextContent("16"), { timeout: 4500 });
  });
});
