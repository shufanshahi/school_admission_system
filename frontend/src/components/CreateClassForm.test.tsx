import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test } from "vitest";
import { backendDown, json, mockBackend, renderWithProviders } from "../test/utils";
import { CreateClassForm } from "./CreateClassForm";

const fill = async (name: string, seats: string) => {
  if (name) await userEvent.type(screen.getByLabelText("Class name"), name);
  if (seats) await userEvent.type(screen.getByLabelText("Total seats"), seats);
  await userEvent.click(screen.getByRole("button", { name: "Create class" }));
};

describe("CreateClassForm", () => {
  test.each(["0", "-3", "abc", "1.5", "100001"])("seats '%s' is refused before anything is sent", async (seats) => {
    const fetchMock = mockBackend({});
    renderWithProviders(<CreateClassForm />);
    await fill("Class 6 - Morning Shift", seats);
    expect(screen.getByText(/Total seats must be/)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("an empty name is refused before anything is sent", async () => {
    const fetchMock = mockBackend({});
    renderWithProviders(<CreateClassForm />);
    await fill("", "10");
    expect(screen.getByText("Please enter a class name.")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("a valid class is created and the form is cleared", async () => {
    const fetchMock = mockBackend({ "POST /classes": ({ body }) => json(201, { id: "c_1", ...(body as object) }) });
    renderWithProviders(<CreateClassForm />);
    await fill("  Class 6 - Day Shift  ", "120");

    expect(await screen.findByTestId("created")).toHaveTextContent("Class created: Class 6 - Day Shift (120 seats)");
    expect(JSON.parse(String((fetchMock.mock.calls[0][1] as RequestInit).body))).toEqual({ name: "Class 6 - Day Shift", totalSeats: 120 });
    expect(screen.getByLabelText("Class name")).toHaveValue("");
  });

  test("server down: a friendly message", async () => {
    backendDown();
    renderWithProviders(<CreateClassForm />);
    await fill("Class 7", "10");
    expect(await screen.findByRole("alert")).toHaveTextContent(/Can't reach the server/);
  });
});
