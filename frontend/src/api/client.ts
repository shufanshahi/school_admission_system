import { API_URL } from "../config";
import type { CreatedClass, CreatedHold, Hold, MyHold, SchoolClass } from "./types";

/** An error with text that is safe to show to a user as-is. */
export class ApiClientError extends Error {
  constructor(
    /** Machine-readable code, e.g. "NO_SEATS_AVAILABLE" or "NETWORK". */
    public readonly code: string,
    /** Friendly message for the user. */
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

const NETWORK_MESSAGE = "Can't reach the server. Please check your connection and try again.";
const GENERIC_MESSAGE = "Something went wrong. Please try again.";

/** Friendly wording for the error codes the backend can return. */
const FRIENDLY: Record<string, string> = {
  NO_SEATS_AVAILABLE: "No seats are left in this class.",
  ALREADY_APPLIED: "You already have an application in this class.",
  HOLD_EXPIRED: "Your hold has expired. Please apply again.",
  HOLD_CANCELLED: "This application was cancelled.",
  ALREADY_CONFIRMED: "This admission is already confirmed.",
  NOT_YOUR_HOLD: "This application belongs to another student.",
  INVALID_STUDENT_ID: "Birth registration number must be exactly 17 digits.",
  CLASS_NOT_FOUND: "We couldn't find that class. It may have been removed.",
  HOLD_NOT_FOUND: "We couldn't find that application.",
};

const REQUEST_TIMEOUT_MS = 15_000;

// ---- server clock -----------------------------------------------------------------------------
// The countdown must follow the SERVER's clock, otherwise a wrong clock on the user's computer
// would show EXPIRED too early or too late.
//
// The Date header only has whole-second precision (it is rounded down) and arrives a little after it
// was written, so every sample can only UNDER-estimate how far ahead the server's clock is. The best
// estimate is therefore the largest of several recent samples. Old samples drop out, so a changed
// computer clock is picked up again within about half a minute.
const OFFSET_SAMPLES = 10;
const offsetSamples: number[] = [];
let serverOffsetMs = 0;

/** "Now" according to the server's clock, in epoch milliseconds. */
export function serverNow(): number {
  return Date.now() + serverOffsetMs;
}

function learnServerTime(response: Response): void {
  const header = response.headers.get("Date");
  if (!header) return;
  const serverTime = Date.parse(header);
  if (Number.isNaN(serverTime)) return;

  offsetSamples.push(serverTime - Date.now());
  if (offsetSamples.length > OFFSET_SAMPLES) offsetSamples.shift();
  serverOffsetMs = Math.max(...offsetSamples);
}

// ---- core request -----------------------------------------------------------------------------
interface RequestOptions {
  studentId?: string;
  body?: unknown;
  /** Checks the JSON really has the shape we are about to rely on (so a wrong answer never crashes a screen). */
  shape: (json: unknown) => boolean;
}

const badResponse = (status?: number) =>
  new ApiClientError("BAD_RESPONSE", "The server sent an answer we couldn't understand. Please try again.", status);

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const hasStrings = (keys: string[]) => (v: unknown) => isObject(v) && keys.every((k) => typeof v[k] === "string");
const isClass = (v: unknown) => hasStrings(["id", "name"])(v) && ["totalSeats", "heldSeats", "confirmedSeats", "availableSeats"].every((k) => typeof (v as Record<string, unknown>)[k] === "number");
const isHold = hasStrings(["holdId", "classId", "status", "expiresAt"]);
const isArrayOf = (item: (v: unknown) => boolean) => (v: unknown) => Array.isArray(v) && v.every(item);

async function request<T>(method: string, path: string, options: RequestOptions): Promise<T> {
  const headers: Record<string, string> = {};
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  if (options.studentId) headers["X-Student-Id"] = options.studentId;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });
  } catch {
    // Server down, no internet, CORS failure, or the request timed out.
    throw new ApiClientError("NETWORK", NETWORK_MESSAGE);
  } finally {
    clearTimeout(timer);
  }

  learnServerTime(response);

  if (response.ok) {
    if (response.status === 204) return undefined as T;
    let json: unknown;
    try {
      json = await response.json();
    } catch {
      throw badResponse(response.status);
    }
    if (!options.shape(json)) throw badResponse(response.status);
    return json as T;
  }

  throw await toError(response);
}

async function toError(response: Response): Promise<ApiClientError> {
  if (response.status >= 500) {
    return new ApiClientError("SERVER_ERROR", "The server had a problem. Please try again in a moment.", response.status);
  }

  let code = "UNKNOWN";
  let serverMessage: string | undefined;
  try {
    const body = (await response.json()) as { error?: string; message?: string };
    if (body.error) code = body.error;
    serverMessage = body.message;
  } catch {
    // body was not JSON; fall through to the generic message
  }

  // INVALID_REQUEST messages name the exact field, so the server's own wording is the friendly one.
  const message = code === "INVALID_REQUEST" ? serverMessage : FRIENDLY[code] ?? serverMessage;
  return new ApiClientError(code, message || GENERIC_MESSAGE, response.status);
}

/** Turns anything that was thrown into text for the user. */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiClientError) return error.message;
  return GENERIC_MESSAGE;
}

// ---- the 8 endpoints --------------------------------------------------------------------------
export const createClass = (name: string, totalSeats: number) =>
  request<CreatedClass>("POST", "/classes", { body: { name, totalSeats }, shape: hasStrings(["id", "name"]) });

export const listClasses = () => request<SchoolClass[]>("GET", "/classes", { shape: isArrayOf(isClass) });

export const getClass = (classId: string) =>
  request<SchoolClass>("GET", `/classes/${encodeURIComponent(classId)}`, { shape: isClass });

export const applyForSeat = (classId: string, studentId: string) =>
  request<CreatedHold>("POST", `/classes/${encodeURIComponent(classId)}/holds`, { studentId, shape: isHold });

export const getHold = (holdId: string) =>
  request<Hold>("GET", `/holds/${encodeURIComponent(holdId)}`, { shape: hasStrings(["holdId", "classId", "className", "studentId", "status", "expiresAt"]) });

export const confirmHold = (holdId: string, studentId: string) =>
  request<{ holdId: string; status: string }>("POST", `/holds/${encodeURIComponent(holdId)}/confirm`, {
    studentId,
    shape: hasStrings(["holdId", "status"]),
  });

export const cancelHold = (holdId: string, studentId: string) =>
  request<void>("DELETE", `/holds/${encodeURIComponent(holdId)}`, { studentId, shape: () => true });

export const myHolds = (studentId: string) =>
  request<MyHold[]>("GET", "/me/holds", { studentId, shape: isArrayOf(hasStrings(["holdId", "classId", "className", "status", "expiresAt"])) });
