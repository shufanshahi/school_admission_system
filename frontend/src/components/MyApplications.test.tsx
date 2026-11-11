import { screen, within } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import type { MyHold } from "../api/types";
import { isoIn, json, mockBackend, renderWithProviders, VALID_ID } from "../test/utils";
import { MyApplications } from "./MyApplications";

describe("MyApplications", () => {
  test("lists the student's applications with their status", async () => {
    const holds: MyHold[] = [
      { holdId: "h_2", classId: "c_2", className: "Class 7 - Day Shift", status: "HELD", expiresAt: isoIn(120_000) },
      { holdId: "h_1", classId: "c_1", className: "Class 6 - Morning Shift", status: "CONFIRMED", expiresAt: isoIn(-60_000) },
      { holdId: "h_0", classId: "c_3", className: "Class 8 - Morning Shift", status: "HELD", expiresAt: isoIn(-1_000) },
    ];
    const fetchMock = mockBackend({ "GET /me/holds": () => json(200, holds) });
    renderWithProviders(<MyApplications />, { studentId: VALID_ID });

    const rowOf = async (name: string) => (await screen.findByText(name)).closest("tr") as HTMLElement;
    expect(within(await rowOf("Class 7 - Day Shift")).getByTestId("status")).toHaveTextContent("HELD");
    expect(within(await rowOf("Class 6 - Morning Shift")).getByTestId("status")).toHaveTextContent("CONFIRMED");
    // stored as HELD but its time is up: shown as EXPIRED straight away
    expect(within(await rowOf("Class 8 - Morning Shift")).getByTestId("status")).toHaveTextContent("EXPIRED");
    expect(((fetchMock.mock.calls[0][1] as RequestInit).headers as Record<string, string>)["X-Student-Id"]).toBe(VALID_ID);
  });

  test("without a valid student id it asks for one and sends nothing", () => {
    const fetchMock = mockBackend({});
    renderWithProviders(<MyApplications />);
    expect(screen.getByTestId("id-hint")).toHaveTextContent("Enter your birth registration number");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("a student with no applications gets a helpful empty state", async () => {
    mockBackend({ "GET /me/holds": () => json(200, []) });
    renderWithProviders(<MyApplications />, { studentId: VALID_ID });
    expect(await screen.findByTestId("no-applications")).toHaveTextContent("You have no applications yet");
  });
});
