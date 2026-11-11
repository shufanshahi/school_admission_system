# School Admission System — Take-home Assignment

**Onnorokom Projukti Limited** · Confidential
**Assistant Software Engineer Recruitment**

| | |
|---|---|
| Position | Assistant Software Engineer |
| Deadline | 11 November 2026 (11:59:59 PM) |
| Stack | .NET 8+ · PostgreSQL · React 18+ · Docker |
| Submit | Your own public GitHub repo |

---

## 1. Assignment: School Admission System

### 1.1 Scenario

A private school will take admissions online for the new academic year. Admission is **first come, first served**, with no lottery. Seats are limited for every class and every shift (for example, "Class 6 – Morning Shift" has 120). As soon as admission opens, thousands of guardians apply at the same time.

When someone applies, a seat is **held** in the student's name for a limited time. If the admission fee is paid within that time, the admission is **confirmed**. If the fee is not paid in time, the seat opens up again for others.

You must build both the backend and the React UI of this admission system. The school admin and guardians do everything from the UI.

> The brief does not spell out everything. Where something is unclear, make a reasonable assumption and write it down, with your reasoning, in `ASSUMPTIONS.md`.

### 1.2 Technology

- **Backend:** C# (.NET 8 or newer) and PostgreSQL. ORM of your choice.
- **Frontend:** React 18 or newer, JavaScript or TypeScript. Starting with Vite is recommended. UI library of your choice.
- The backend runs on `http://localhost:8080`. The database connection must be configurable via environment variable.
- The backend URL used by the frontend must be configurable via environment variable.
- The whole project runs with Docker. Put a `docker-compose.yml` in the repository root so that just `docker compose up` starts PostgreSQL, the backend and the frontend together. Nothing other than Docker needs to be installed on our machine. This is how we will run the app.
- AI tools may be used.

### 1.3 What the UI must have

A class can have multiple shifts. In this system each shift is created as a separate "class" with its own seat count. For example, "Class 6 – Morning Shift" and "Class 6 – Day Shift" are two separate classes.

No login is needed. There is a field at the top of the page where the student's birth registration number is entered. The UI uses this as the student's identity.

| Screen | Purpose |
|---|---|
| Create class (school admin) | Create a new class with a name and seat count |
| Class list | For each class: total, held, confirmed and available seats; an "Apply" button |
| Application | Status, time remaining until expiry, "Pay admission fee" and "Cancel" buttons |
| My applications | All of this student's applications and the status of each |

When "Pay admission fee" is pressed, assume the payment succeeded. No real payment gateway is needed.

The UI doesn't need to look beautiful. What matters is that it works correctly and is easy to use.

### 1.4 API

> ⚠️ The UI will call these APIs. The contract must be followed exactly, because besides the UI we will also run automated tests directly against the API. You may add extra fields to responses, but you must not remove or rename any field below.

Base URL `http://localhost:8080`; all requests and responses are JSON. The student's identity comes in the `X-Student-Id` header. Its value is the student's 17-digit birth registration number. In the API too, each shift is a separate "class" (see §1.3). The example IDs (`c_123`, `h_789`) are just examples; the ID format is your choice.

| # | Method & Path | Purpose |
|---|---|---|
| 1 | `POST /classes` | Create a new class |
| 2 | `GET /classes` | List all classes, with seat counts |
| 3 | `GET /classes/{classId}` | Seat status of one class |
| 4 | `POST /classes/{classId}/holds` | Apply (hold a seat) |
| 5 | `GET /holds/{holdId}` | Current status of an application |
| 6 | `POST /holds/{holdId}/confirm` | Pay admission fee, confirm admission |
| 7 | `DELETE /holds/{holdId}` | Cancel an application |
| 8 | `GET /me/holds` | All applications of this student |

#### 1. `POST /classes`

```jsonc
// request
{ "name": "Class 6 - Morning Shift", "totalSeats": 120 }

// 201 response
{ "id": "c_123", "name": "Class 6 - Morning Shift", "totalSeats": 120 }
```

#### 2. `GET /classes`

```jsonc
// 200 response
[
  { "id": "c_123", "name": "Class 6 - Morning Shift", "totalSeats": 120, "heldSeats": 15,
    "confirmedSeats": 80, "availableSeats": 25 }
]
```

#### 3. `GET /classes/{classId}`

```jsonc
// 200 response
{ "id": "c_123", "name": "Class 6 - Morning Shift", "totalSeats": 120, "heldSeats": 15,
  "confirmedSeats": 80, "availableSeats": 25 }
```

#### 4. `POST /classes/{classId}/holds`

Header: `X-Student-Id`

```jsonc
// 201 response
{
  "holdId": "h_789",
  "classId": "c_123",
  "studentId": "20152691234567890",
  "status": "HELD",
  "expiresAt": "2026-11-01T04:10:00Z"
}
```

If no seat is available: `409`.

#### 5. `GET /holds/{holdId}`

```jsonc
// 200 response
{ "holdId": "h_789", "classId": "c_123", "status": "HELD", "expiresAt": "2026-11-01T04:10:00Z" }
```

`status` can be `HELD`, `CONFIRMED`, `EXPIRED` or `CANCELLED`.

#### 6. `POST /holds/{holdId}/confirm`

Header: `X-Student-Id`

```jsonc
// 200 response
{ "holdId": "h_789", "status": "CONFIRMED" }
```

#### 7. `DELETE /holds/{holdId}`

Header: `X-Student-Id`. `204` on success.

#### 8. `GET /me/holds`

Header: `X-Student-Id`

```jsonc
// 200 response
[
  { "holdId": "h_789", "classId": "c_123", "className": "Class 6 - Morning Shift", "status":
"HELD", "expiresAt": "2026-11-01T04:10:00Z" }
]
```

### 1.5 Rules (mandatory)

**Backend**

- Under no circumstances may `held + confirmed` in a class exceed `totalSeats`, no matter how many requests arrive at once.
- The hold duration is set by the environment variable `HOLD_DURATION_SECONDS` (default `600`). When it expires the seat returns on its own, with nobody needing to call any API.
- A student cannot have more than one active application or confirmed admission in the same class at the same time.
- Only the student's own, unexpired `HELD` application can be confirmed.
- If confirm is called multiple times on the same application, `confirmedSeats` increases only once.
- No data may be lost when the app restarts, including after `docker compose down` followed by `docker compose up`.

**UI**

- Everything can be done from the UI. No Postman or direct DB access is needed anywhere.
- When the hold expires, the application shows `EXPIRED` without a page reload, and the "Pay admission fee" button is disabled.
- A class's seat counts update every few seconds without a page reload.
- After a page refresh, or closing and reopening the browser, the student can still see their ongoing applications.
- Any error (no seats left, expired, invalid input, server down) must be shown in language the user can understand. A blank page, or an error only in the console, is not acceptable.

### 1.6 Bonus (optional)

- Even when two backend processes run on different ports against the same database, `held + confirmed` must not exceed `totalSeats`. Explain how you ensured this in `ASSUMPTIONS.md`.
- Automated tests for the frontend.

### 1.7 What to submit

- A Git repository with commit history, containing `backend/` and `frontend/` folders. Commit as you work, rather than making one big commit at the end.
- A `Dockerfile` for the backend and the frontend, and a `docker-compose.yml` in the repository root (see §1.2).
- `README.md`: steps to run the app with Docker, which URL the frontend opens at, and how to run the tests.
- `ASSUMPTIONS.md` (short): what you assumed where the spec isn't explicit, and why.
- At least 3 automated tests in the backend, one of which is a concurrency test. A concurrency test means sending many requests at once to show that no more seats are held than exist.
- `AI_USAGE.md` (short): which AI tool you used, for which parts, where the AI made mistakes, and how you caught them.

---

## 2. Submitting the Project

- Create a **public** repository on your own GitHub account and keep all your work there.
- Submit the repository link through the submission link below before the deadline.
- We will evaluate the repository as it is at the deadline. Any commit or push after that will not count.
- Do not make this assignment PDF public, and do not share it with anyone.

**Submit your project:** When the project is finished, submit it using the link below:

**https://q-rp.com/c/4CXx**

If you have any trouble submitting, contact hrd@onnorokom.com.

Thank you, and best of luck!
