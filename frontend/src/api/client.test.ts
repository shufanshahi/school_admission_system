import { describe, expect, test } from "vitest";
import { backendDown, json, mockBackend, VALID_ID } from "../test/utils";
import { ApiClientError, applyForSeat, cancelHold, createClass, listClasses, serverNow } from "./client";

async function caught(promise: Promise<unknown>): Promise<ApiClientError> {
  try {
    await promise;
  } catch (e) {
    if (e instanceof ApiClientError) return e;
    throw e;
  }
  throw new Error("expected the call to fail");
}

describe("API client errors are readable", () => {
  test("409 NO_SEATS_AVAILABLE -> friendly message", async () => {
    mockBackend({ "POST /classes/c_1/holds": () => json(409, { error: "NO_SEATS_AVAILABLE", message: "x" }) });
    const error = await caught(applyForSeat("c_1", VALID_ID));
    expect(error.code).toBe("NO_SEATS_AVAILABLE");
    expect(error.message).toBe("No seats are left in this class.");
  });

  test("409 ALREADY_APPLIED -> friendly message", async () => {
    mockBackend({ "POST /classes/c_1/holds": () => json(409, { error: "ALREADY_APPLIED", message: "x" }) });
    expect((await caught(applyForSeat("c_1", VALID_ID))).message).toBe("You already have an application in this class.");
  });

  test("server down -> 'Can't reach the server'", async () => {
    backendDown();
    const error = await caught(listClasses());
    expect(error.code).toBe("NETWORK");
    expect(error.message).toMatch(/Can't reach the server/);
  });

  test("400 INVALID_REQUEST keeps the server's field-specific wording", async () => {
    mockBackend({ "POST /classes": () => json(400, { error: "INVALID_REQUEST", message: "Total seats must be a whole number." }) });
    expect((await caught(createClass("X", 1))).message).toBe("Total seats must be a whole number.");
  });

  test("500 -> a calm generic message (no internals)", async () => {
    mockBackend({ "GET /classes": () => json(500, { error: "INTERNAL_ERROR", message: "NullReferenceException at ..." }) });
    const error = await caught(listClasses());
    expect(error.message).not.toMatch(/Exception/);
    expect(error.message).toMatch(/server had a problem/);
  });

  test("an answer of the wrong shape is rejected instead of crashing a screen", async () => {
    mockBackend({ "GET /classes": () => json(200, { oops: true }) });
    expect((await caught(listClasses())).code).toBe("BAD_RESPONSE");
  });
});

describe("API client requests", () => {
  test("sends the student id header and handles 204 No Content", async () => {
    const fetchMock = mockBackend({ "DELETE /holds/h_1": () => json(204, null) });
    await expect(cancelHold("h_1", VALID_ID)).resolves.toBeUndefined();
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>)["X-Student-Id"]).toBe(VALID_ID);
  });

  test("follows the server's clock from the Date header", async () => {
    const serverTime = Date.now() + 5 * 60_000;   // server clock 5 minutes ahead of this computer
    mockBackend({ "GET /classes": () => json(200, [], { Date: new Date(serverTime).toUTCString() }) });
    await listClasses();
    expect(Math.abs(serverNow() - serverTime)).toBeLessThan(1500);   // Date header has 1 s precision
  });
});
