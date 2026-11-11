# School Admission System

Online, first-come-first-served school admission. A guardian applies for a seat in a class (each shift is its own class), the seat is **held** for a limited time, and paying the admission fee **confirms** it. An unpaid hold expires by itself and the seat goes back to the pool.

- **Backend:** .NET 8, ASP.NET Core minimal APIs, EF Core + PostgreSQL 16
- **Frontend:** React 18, TypeScript, Vite (served by nginx in Docker)
- **Everything runs with Docker Compose.** Nothing else needs to be installed.

See also [ASSUMPTIONS.md](ASSUMPTIONS.md) (decisions where the brief is open, and how overselling is prevented) and [AI_USAGE.md](AI_USAGE.md).

---

## Run it

```bash
docker compose up --build
```

| What | URL |
|---|---|
| **App (frontend)** | **http://localhost:3000** |
| API (backend) | http://localhost:8080 (health check: `/health`) |
| PostgreSQL | not published to the host; only the backend can reach it |

The first build takes a few minutes (it downloads the .NET, Node and Postgres images). The backend creates the database tables itself on startup and waits for Postgres if it is not ready yet.

**Stop:** `docker compose down` (keeps all data) · **Wipe all data:** `docker compose down -v`

Data lives in the named volume `pgdata`, so it survives restarts and `docker compose down` followed by `docker compose up`.

### Using the app

1. Enter a 17-digit birth registration number at the top of the page (for example `20152691234567890`). It is remembered in the browser.
2. **Create class (Admin):** add a class, e.g. "Class 6 - Morning Shift" with 120 seats.
3. **Classes:** total, held, confirmed and available seats for every class, refreshed every 3 seconds. Click **Apply**.
4. **Application:** status and a countdown. **Pay admission fee** confirms the seat (payment is simulated). **Cancel** releases it. When the time runs out the screen shows `EXPIRED` and Pay is disabled, without a reload.
5. **My applications:** every application of the current student and its status.

To act as another student, change the number at the top.

---

## Configuration

All settings are environment variables in [docker-compose.yml](docker-compose.yml).

| Variable | Service | Default | Meaning |
|---|---|---|---|
| `HOLD_DURATION_SECONDS` | backend | `600` | How long a seat is held before it expires. Invalid or ≤ 0 falls back to 600. |
| `ConnectionStrings__Default` | backend | `Host=db;Port=5432;Database=admission;Username=admission;Password=admission` | PostgreSQL connection. Each backend process uses at most 40 connections unless `Maximum Pool Size` is set in this string. |
| `API_URL` | frontend | `http://localhost:8080` | Backend URL **as seen from the browser**. Read when the container starts, so it can be changed without rebuilding. |

Tip for trying expiry quickly: set `HOLD_DURATION_SECONDS` to `20` and run `docker compose up -d backend`.

---

## Tests

### Backend: 58 tests (xUnit, against a real PostgreSQL started by Testcontainers)

Includes the required concurrency test (200 students applying for 20 seats at the same instant: exactly 20 succeed), plus duplicate applications, confirm idempotency, expiry, cancel, validation, the API contract, and two backend instances sharing one database.

```bash
# with only Docker installed
docker run --rm --network host -v /var/run/docker.sock:/var/run/docker.sock -v "$PWD/backend":/src:ro \
  mcr.microsoft.com/dotnet/sdk:8.0 sh -c \
  'mkdir /work && cd /src && tar --exclude=bin --exclude=obj -cf - . | tar -xf - -C /work && cd /work && dotnet test'

# or, with the .NET 8 SDK installed (Docker must be running)
cd backend && dotnet test
```

### Frontend: 55 tests (Vitest + React Testing Library)

Student ID validation, readable error messages (no seats, expired, server down, invalid input), the countdown flipping to `EXPIRED` and disabling Pay, seat counts refreshing, and the create-class form.

```bash
# with only Docker installed
docker run --rm -v "$PWD/frontend":/app:ro node:20-alpine sh -c \
  'mkdir /work && cd /app && tar --exclude=node_modules --exclude=dist -cf - . | tar -xf - -C /work && cd /work && npm ci && npm test'

# or, with Node 20+ installed
cd frontend && npm ci && npm test
```

### Bonus: two backend processes, one database

Starts a second backend on port 8081, then 1000 students apply for 50 seats at once, split across both backends. The script checks the results itself and exits non-zero on any problem.

```bash
docker compose -f docker-compose.yml -f docker-compose.multi.yml up --build -d
./scripts/multi-instance-test.sh            # needs bash and curl
```

`./scripts/smoke-concurrency.sh [url] [seats] [requests] [parallel]` is a quicker manual check against one backend (needs `jq`).

---

## API

Base URL `http://localhost:8080`. JSON in and out. The student is identified by the `X-Student-Id` header: exactly 17 digits.

| # | Endpoint | Success | Errors |
|---|---|---|---|
| 1 | `POST /classes` | `201` `{ id, name, totalSeats }` | `400` invalid name or seats |
| 2 | `GET /classes` | `200` `[{ id, name, totalSeats, heldSeats, confirmedSeats, availableSeats }]` | |
| 3 | `GET /classes/{classId}` | `200` same fields as above | `404` |
| 4 | `POST /classes/{classId}/holds` | `201` `{ holdId, classId, studentId, status, expiresAt }` | `400` bad header · `404` · `409` no seat left, or already applied to this class |
| 5 | `GET /holds/{holdId}` | `200` `{ holdId, classId, status, expiresAt }` (+ `className`, `studentId`) | `404` |
| 6 | `POST /holds/{holdId}/confirm` | `200` `{ holdId, status: "CONFIRMED" }` (also when already confirmed) | `400` · `403` not your application · `404` · `409` expired or cancelled |
| 7 | `DELETE /holds/{holdId}` | `204` (also when already cancelled) | `400` · `403` · `404` · `409` already confirmed or expired |
| 8 | `GET /me/holds` | `200` `[{ holdId, classId, className, status, expiresAt }]`, newest first | `400` |

`status` is `HELD`, `CONFIRMED`, `EXPIRED` or `CANCELLED`. Times are UTC ISO-8601 ending in `Z`.

Every error has the same body, so clients can show it directly:

```json
{ "error": "NO_SEATS_AVAILABLE", "message": "Sorry, no seats are left in this class." }
```

Error codes: `INVALID_REQUEST`, `INVALID_STUDENT_ID`, `CLASS_NOT_FOUND`, `HOLD_NOT_FOUND`, `NOT_YOUR_HOLD`, `NO_SEATS_AVAILABLE`, `ALREADY_APPLIED`, `HOLD_EXPIRED`, `HOLD_CANCELLED`, `ALREADY_CONFIRMED`, `INTERNAL_ERROR`.

---

## Project layout

```
backend/
  SchoolAdmission.Api/
    Endpoints/        HTTP routes (classes, holds)
    Data/             HoldService (all seat logic + locking), queries, EF model, expiry sweeper
    Migrations/       database schema (applied automatically on startup)
    Infrastructure/   error handling, X-Student-Id validation
  SchoolAdmission.Tests/
  Dockerfile
frontend/
  src/api/            API client (friendly errors, server clock)
  src/components/     screens
  src/hooks/          polling, countdown, routing
  nginx.conf, docker-entrypoint.sh, Dockerfile
scripts/              load and multi-instance test scripts
docker-compose.yml          the app (db, backend, frontend)
docker-compose.multi.yml    optional second backend for the bonus test
```
