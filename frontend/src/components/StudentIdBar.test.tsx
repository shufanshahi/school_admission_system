import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test } from "vitest";
import { renderWithProviders } from "../test/utils";
import { StudentIdBar } from "./StudentIdBar";

describe("StudentIdBar", () => {
  const input = () => screen.getByLabelText("Student birth registration number") as HTMLInputElement;

  test("ignores letters and keeps only digits", async () => {
    renderWithProviders(<StudentIdBar />);
    await userEvent.type(input(), "12ab3-4");
    expect(input().value).toBe("1234");
  });

  test("16 digits: says it must be exactly 17", async () => {
    renderWithProviders(<StudentIdBar />);
    await userEvent.type(input(), "2015269123456789");
    expect(screen.getByText(/must be exactly 17 digits \(16\/17\)/)).toBeInTheDocument();
    expect(input()).toHaveAttribute("aria-invalid", "true");
  });

  test("17 digits: valid, and remembered for next time", async () => {
    renderWithProviders(<StudentIdBar />);
    await userEvent.type(input(), "20152691234567890");
    expect(screen.getByText(/Valid/)).toBeInTheDocument();
    expect(localStorage.getItem("school-admission.studentId")).toBe("20152691234567890");
  });

  test("cannot go beyond 17 digits", async () => {
    renderWithProviders(<StudentIdBar />);
    await userEvent.type(input(), "2015269123456789012345");
    expect(input().value).toHaveLength(17);
  });

  test("restores the saved number after a reload", () => {
    renderWithProviders(<StudentIdBar />, { studentId: "20152691234567890" });
    expect(input().value).toBe("20152691234567890");
  });
});
