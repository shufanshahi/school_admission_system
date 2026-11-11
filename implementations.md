# Implementation Plan: School Admission System (step-by-step, test as you build)

Deadline: **11 Nov 2026, 11:59:59 PM**. The graders run `docker compose up` and hit the API directly, so the API contract (brief §1.4) is the top priority.

## How to use this document

- Work **top to bottom**. Each step is small and ends with a **Verify** block. Do not start the next step until Verify passes.
- Each step ends with a **Commit** line. The brief requires incremental history.
- Tick the checkboxes as you go.
- Steps marked 🔒 are the correctness-critical ones. Go slowly there.
- Steps marked ⭐ are bonus.

## Stack decisions (fixed)

| Topic | Decision |
|---|---|
| Database | **PostgreSQL 16** (Docker, named volume) |
| Backend | .NET 8, ASP.NET Core Minimal APIs, EF Core + Npgsql (migrations + reads), raw SQL inside a transaction for the locking paths |
| Frontend | React 18 + Vite + TypeScript, plain `fetch` |
| IDs | `c_<guid-no-dashes>`, `h_<guid-no-dashes>` |
| Seat safety | Per-class row lock `SELECT ... FOR UPDATE` in a transaction |
| Time | UTC only. Decide expiry with the **DB clock** (`clock_timestamp()` inside transactions, `now()` in plain reads) |
| Expiry | Lazy (`expires_at > now()`) plus a background sweeper |
| Backend tests | xUnit + `WebApplicationFactory` + Testcontainers (Postgres) |

### Two gotchas to remember from the start

1. **`now()` in Postgres returns the transaction start time.** A request waiting on the class lock would stamp `expires_at` with a time from before it got the lock. Inside locked transactions use `clock_timestamp()`.
2. **`System.Text.Json` writes a `DateTimeOffset` with zero offset as `+00:00`, not `Z`.** Use `DateTime` with `Kind = Utc` in response DTOs, then check that the JSON ends in `Z`.

### Target repo layout

```
School_Admission_System/
├── backend/
│   ├── SchoolAdmission.sln
│   ├── SchoolAdmission.Api/
│   ├── SchoolAdmission.Tests/
│   └── Dockerfile
├── frontend/
│   ├── src/
│   ├── nginx.conf
│   ├── docker-entrypoint.sh
│   └── Dockerfile
├── scripts/            (smoke + load scripts)
├── docker-compose.yml
├── README.md
├── ASSUMPTIONS.md
├── AI_USAGE.md
└── .gitignore
```

---

# PHASE A: Repo and tooling

## Step A1: Check your tools
**Do**
```bash
dotnet --version     # must be 8.x or newer
node --version       # 18+ (20+ preferred)
docker --version
docker compose version
dotnet tool install --global dotnet-ef --version 8.*   # EF migrations CLI
```
**Verify**: all commands print versions and `dotnet ef --version` works.
**If `dotnet` is missing**: install the .NET 8 SDK locally for development (Docker is only required for the final run, but local `dotnet` makes iteration much faster).

## Step A2: Initialise git
**Do**
```bash
cd "/mnt/Academia/Work/Jobs/OnnoRokom Projukti/School_Admission_System"
git init -b main
```
Create `.gitignore`:
```
assignment-brief.md
implementations.md
bin/
obj/
node_modules/
dist/
.env
*.user
.vs/
.idea/
```
(Keep `implementations.md` ignored if you do not want the plan public. Remove that line if you do.)

**Verify**: `git status` does not list `assignment-brief.md`.
**Commit**: `chore: initialise repo and gitignore`

## Step A3: Postgres only, via compose
**Do**: create a first `docker-compose.yml` with **only** the database:
```yaml
services:
  db:
    image: postgres:16
    environment:
      POSTGRES_USER: admission
      POSTGRES_PASSWORD: admission
      POSTGRES_DB: admission
    ports:
      - "5432:5432"        # exposed for local development; change the left side if 5432 is busy
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U admission -d admission"]
      interval: 3s
      timeout: 3s
      retries: 20
    restart: unless-stopped
volumes:
  pgdata:
```
**Verify**
```bash
docker compose up -d db
docker compose ps                       # db should be "healthy"
docker compose exec db psql -U admission -d admission -c "select version();"
```
**Commit**: `chore: docker-compose with postgres and named volume`

---

# PHASE B: Backend skeleton

## Step B1: Create the solution and a health endpoint
**Do**
```bash
mkdir backend && cd backend
dotnet new sln -n SchoolAdmission
dotnet new web -n SchoolAdmission.Api -f net8.0
dotnet sln add SchoolAdmission.Api
dotnet add SchoolAdmission.Api package Npgsql.EntityFrameworkCore.PostgreSQL --version 8.*
dotnet add SchoolAdmission.Api package Microsoft.EntityFrameworkCore.Design --version 8.*
```
In `Program.cs`:
- Add `app.MapGet("/health", () => Results.Ok(new { status = "ok" }));`
- End the file with `public partial class Program { }` (needed for tests later).
- Force the URL via `launchSettings.json` or `ASPNETCORE_URLS=http://localhost:8080`.

**Verify**
```bash
cd SchoolAdmission.Api && ASPNETCORE_URLS=http://localhost:8080 dotnet run
# other terminal:
curl -i http://localhost:8080/health      # 200 {"status":"ok"}
```
**Commit**: `feat(backend): scaffold API project with health endpoint`

## Step B2: Configuration (connection string and hold duration)
**Do**
- Create `HoldOptions { int DurationSeconds = 600 }`.
- Read `HOLD_DURATION_SECONDS` straight from the environment, because the brief names that exact variable: `Environment.GetEnvironmentVariable("HOLD_DURATION_SECONDS")`. Parse it, fall back to 600, and reject values `<= 0` (log a warning and use 600).
- Connection string comes from `ConnectionStrings__Default` (ASP.NET maps the double underscore to `ConnectionStrings:Default`). Put a dev default in `appsettings.Development.json` pointing at `localhost:5432`, `admission/admission`.
- Register the options in DI.

**Verify**: write a temporary `/debug/config` endpoint (delete it before the final commit) that returns the hold duration. Run with `HOLD_DURATION_SECONDS=30` and confirm it shows `30`, then without it and confirm `600`.
**Commit**: `feat(backend): configuration for connection string and hold duration`

## Step B3: EF Core model, DbContext and first migration
**Do**
- Entities:
  - `ClassEntity { string Id; string Name; int TotalSeats; DateTime CreatedAt }`
  - `HoldEntity { string Id; string ClassId; string StudentId; string Status; DateTime CreatedAt; DateTime ExpiresAt; DateTime? ConfirmedAt; DateTime? CancelledAt }`
- Use snake_case table and column names (`classes`, `holds`) via `ToTable` and `HasColumnName`, or the `EFCore.NamingConventions` package. This keeps the raw SQL readable.
- `AdmissionDbContext` with both `DbSet`s. Column types: `timestamptz` for dates, `varchar(17)` for `student_id`, `varchar(200)` for `name`, `varchar(16)` for `status`.
- Set `CreatedAt` default to `now()` in SQL (`HasDefaultValueSql("now()")`).
- Create the migration:
```bash
cd backend
dotnet ef migrations add InitialCreate -p SchoolAdmission.Api -s SchoolAdmission.Api
```

**Verify**
```bash
dotnet ef database update -p SchoolAdmission.Api -s SchoolAdmission.Api
docker compose exec db psql -U admission -d admission -c "\d classes" -c "\d holds"
```
Both tables exist with the expected columns.
**Commit**: `feat(backend): EF Core model and initial migration`

## Step B4: Database constraints (the backstop 🔒)
**Do**: add a second migration (`AddConstraints`) with raw SQL in `migrationBuilder.Sql(...)`:
```sql
ALTER TABLE classes ADD CONSTRAINT ck_classes_total_seats CHECK (total_seats > 0);

ALTER TABLE holds ADD CONSTRAINT ck_holds_status
  CHECK (status IN ('HELD','CONFIRMED','EXPIRED','CANCELLED'));

-- one active (HELD or CONFIRMED) row per student per class
CREATE UNIQUE INDEX ux_holds_active_student_class
  ON holds (class_id, student_id) WHERE status IN ('HELD','CONFIRMED');

CREATE INDEX ix_holds_class_status_expires ON holds (class_id, status, expires_at);
CREATE INDEX ix_holds_student_created ON holds (student_id, created_at DESC);
```
Also add a `Down` that drops them.

**Verify** (in `psql`):
```sql
INSERT INTO classes(id,name,total_seats) VALUES ('c_t','T',0);                -- must FAIL (check)
INSERT INTO classes(id,name,total_seats) VALUES ('c_t','T',2);                -- ok
INSERT INTO holds(id,class_id,student_id,status,expires_at) VALUES ('h_1','c_t','11111111111111111','HELD',now()+interval '1 min');   -- ok
INSERT INTO holds(id,class_id,student_id,status,expires_at) VALUES ('h_2','c_t','11111111111111111','HELD',now()+interval '1 min');   -- must FAIL (unique)
DELETE FROM holds; DELETE FROM classes;   -- clean up
```
**Commit**: `feat(backend): db constraints and indexes`

## Step B5: Auto-migrate on startup, with retry
**Do**: at startup, before `app.Run()`, call `db.Database.MigrateAsync()` in a retry loop (for example 20 attempts, 2s apart, logging each failure). The DB container may be healthy slightly after the backend starts.

**Verify**
1. `docker compose down -v && docker compose up -d db` (fresh DB; `-v` is fine in development).
2. Start the API and wait for it to come up.
3. `psql` shows both tables, and the `__EFMigrationsHistory` table lists both migrations.
4. Stop Postgres, start the API (it should log retries), start Postgres, and the API should come up.

**Commit**: `feat(backend): apply migrations on startup with retry`

## Step B6: Cross-cutting infrastructure (errors, JSON, header) 🔒
**Do**
1. **JSON**: camelCase (default for minimal APIs). Add `JsonStringEnumConverter` only if you use enums, or keep status as plain strings (simpler).
2. **`ApiException(int status, string code, string message)`** and an exception-handling middleware that returns:
```json
{ "error": "NO_SEATS_AVAILABLE", "message": "Sorry, no seats are left in this class." }
```
   with the right status code. Any other exception returns `500 { "error": "INTERNAL_ERROR", "message": "Something went wrong. Please try again." }` and logs the details.
3. **Malformed JSON body** returns `400 { "error": "INVALID_REQUEST", ... }`, not `500` (catch `BadHttpRequestException` or read the body defensively).
4. **`StudentIdHeader.Require(HttpContext)`**: reads `X-Student-Id`, trims, validates `^\d{17}$` (use `[0-9]`, since `\d` matches Unicode digits in .NET), and throws `ApiException(400, "INVALID_STUDENT_ID", ...)`.
5. **CORS**: allow any origin, header and method in development. It is a no-login public API, so this is acceptable here (note it in ASSUMPTIONS.md). Allow the `X-Student-Id` header explicitly, and **expose the `Date` header** so the frontend can read it for clock-skew correction:
   `.WithExposedHeaders("Date")`.

**Verify**: add a temporary endpoint that calls `Require`, then:
```bash
curl -i localhost:8080/tmp -H "X-Student-Id: 123"               # 400 + JSON error
curl -i localhost:8080/tmp -H "X-Student-Id: 12345678901234567" # 200
curl -i localhost:8080/tmp                                       # 400 + JSON error
curl -i -X POST localhost:8080/tmp -H "Content-Type: application/json" -d '{bad'   # 400, not 500
```
Remove the temporary endpoint.
**Commit**: `feat(backend): error handling, student header validation, CORS`

---

# PHASE C: Classes (APIs 1–3)

## Step C1: `POST /classes`
**Do**
- Request: `{ name, totalSeats }`. Validate:
  - `name`: required, trimmed, 1–200 chars.
  - `totalSeats`: integer, 1 to 100000. Reject strings, decimals, null, and missing with `400 INVALID_REQUEST` and a message that names the field.
- Generate the ID `c_` + `Guid.NewGuid().ToString("N")`.
- Return `201` with `{ id, name, totalSeats }` (also set the `Location` header if you like).

**Verify**
```bash
curl -i -X POST localhost:8080/classes -H 'Content-Type: application/json' \
  -d '{"name":"Class 6 - Morning Shift","totalSeats":120}'          # 201
curl -i -X POST localhost:8080/classes -H 'Content-Type: application/json' -d '{"name":"","totalSeats":10}'      # 400
curl -i -X POST localhost:8080/classes -H 'Content-Type: application/json' -d '{"name":"X","totalSeats":0}'      # 400
curl -i -X POST localhost:8080/classes -H 'Content-Type: application/json' -d '{"name":"X","totalSeats":-5}'     # 400
curl -i -X POST localhost:8080/classes -H 'Content-Type: application/json' -d '{"name":"X","totalSeats":"abc"}'  # 400
curl -i -X POST localhost:8080/classes -H 'Content-Type: application/json' -d '{"name":"X"}'                    # 400
```
Check in `psql` that the row exists.
**Commit**: `feat(backend): POST /classes`

## Step C2: Seat count query (shared by `GET /classes` and `GET /classes/{id}`)
**Do**: one query used by both endpoints:
```sql
SELECT c.id, c.name, c.total_seats,
       COUNT(h.id) FILTER (WHERE h.status = 'HELD' AND h.expires_at > now()) AS held,
       COUNT(h.id) FILTER (WHERE h.status = 'CONFIRMED')                      AS confirmed
FROM classes c
LEFT JOIN holds h ON h.class_id = c.id
-- optional: WHERE c.id = @id
GROUP BY c.id
ORDER BY c.created_at, c.id;
```
Map to `{ id, name, totalSeats, heldSeats, confirmedSeats, availableSeats }` where `availableSeats = max(0, total - held - confirmed)`.

**Verify**: temporarily insert test holds directly with `psql` and check the numbers:
```sql
INSERT INTO holds(id,class_id,student_id,status,expires_at) VALUES
 ('h_a','<classId>','11111111111111111','HELD',now()+interval '10 min'),
 ('h_b','<classId>','22222222222222222','HELD',now()-interval '1 min'),      -- expired, must NOT count
 ('h_c','<classId>','33333333333333333','CONFIRMED',now()+interval '10 min');
```
Expect `heldSeats=1`, `confirmedSeats=1`, `availableSeats=total-2`. Then delete the test holds.
**Commit**: `feat(backend): seat count query`

## Step C3: `GET /classes` and `GET /classes/{classId}`
**Do**: both endpoints using the C2 query. An unknown ID returns `404 { error: "CLASS_NOT_FOUND", ... }`. An empty system returns `[]`.

**Verify**
```bash
curl -s localhost:8080/classes | jq
curl -s localhost:8080/classes/<id> | jq
curl -i localhost:8080/classes/does_not_exist       # 404 JSON error
```
Field names must be exactly `id, name, totalSeats, heldSeats, confirmedSeats, availableSeats`.
**Commit**: `feat(backend): GET /classes and GET /classes/{id}`

---

# PHASE D: Holds (APIs 4–8)

## Step D1: `POST /classes/{classId}/holds` 🔒
This is the heart of the assignment. Implement it exactly as follows.

**Do**: single transaction (default READ COMMITTED is fine because of the row lock):
```text
1. studentId = StudentIdHeader.Require(...)                       -> 400 if bad
2. BEGIN
3. SELECT total_seats FROM classes WHERE id = @classId FOR UPDATE  -> no row: 404 CLASS_NOT_FOUND
4. UPDATE holds SET status='EXPIRED'
     WHERE class_id=@classId AND student_id=@studentId
       AND status='HELD' AND expires_at <= clock_timestamp()
5. If EXISTS (class_id, student_id, status IN ('HELD','CONFIRMED'))  -> 409 ALREADY_APPLIED
6. SELECT count(*) FILTER (status='CONFIRMED'),
          count(*) FILTER (status='HELD' AND expires_at > clock_timestamp())
     FROM holds WHERE class_id=@classId
   If confirmed + held >= total_seats                              -> 409 NO_SEATS_AVAILABLE
7. INSERT INTO holds(id,class_id,student_id,status,created_at,expires_at)
     VALUES (@id,@classId,@studentId,'HELD', clock_timestamp(),
             clock_timestamp() + make_interval(secs => @durationSeconds))
     RETURNING expires_at
8. COMMIT
9. return 201 { holdId, classId, studentId, status:"HELD", expiresAt }
```
Notes:
- Step 3 serialises every apply for this class, in this process or any other.
- Step 4 matters. A timed-out but not-yet-swept `HELD` row would otherwise trip the partial unique index.
- Also catch Postgres error `23505` (unique violation) and return `409 ALREADY_APPLIED`, as a defensive backstop.
- Roll back on any exception (`await using var tx`).
- `expiresAt` is returned as a UTC `DateTime` that serialises with `Z`.

**Verify** (sequential, single-threaded)
```bash
CID=<class id with totalSeats=2>
curl -i -X POST localhost:8080/classes/$CID/holds -H "X-Student-Id: 11111111111111111"   # 201, status HELD
curl -i -X POST localhost:8080/classes/$CID/holds -H "X-Student-Id: 11111111111111111"   # 409 ALREADY_APPLIED
curl -i -X POST localhost:8080/classes/$CID/holds -H "X-Student-Id: 22222222222222222"   # 201
curl -i -X POST localhost:8080/classes/$CID/holds -H "X-Student-Id: 33333333333333333"   # 409 NO_SEATS_AVAILABLE
curl -s localhost:8080/classes/$CID | jq     # heldSeats 2, availableSeats 0
curl -i -X POST localhost:8080/classes/nope/holds -H "X-Student-Id: 11111111111111111"   # 404
curl -i -X POST localhost:8080/classes/$CID/holds                                         # 400
```
Check the `expiresAt` value ends with `Z` and is about 10 minutes ahead. Then run with `HOLD_DURATION_SECONDS=15`, apply, wait 16s, and check `GET /classes/$CID` shows the seat returned, and that the same student can apply again.
**Commit**: `feat(backend): apply for a seat with per-class row locking`

## Step D2: `GET /holds/{holdId}`
**Do**
- Join `classes` for `className`.
- Return `{ holdId, classId, status, expiresAt }` plus the extras `studentId` and `className`.
- **Effective status**: if the stored status is `HELD` and `expires_at <= now()`, return `EXPIRED`. Do this in SQL: `CASE WHEN h.status='HELD' AND h.expires_at <= now() THEN 'EXPIRED' ELSE h.status END`.
- Unknown ID returns `404 HOLD_NOT_FOUND`.

**Verify**: apply with `HOLD_DURATION_SECONDS=15`, `GET` it immediately (`HELD`), wait 16s, `GET` again (`EXPIRED`), without any other call in between. Unknown ID gives `404`.
**Commit**: `feat(backend): GET /holds/{id} with effective status`

## Step D3: `GET /me/holds`
**Do**: require the header; select the student's holds joined to classes; order by `created_at DESC`; effective status as in D2. Return an array with `holdId, classId, className, status, expiresAt`. A student with no holds gets `[]`.

**Verify**
```bash
curl -s localhost:8080/me/holds -H "X-Student-Id: 11111111111111111" | jq
curl -s localhost:8080/me/holds -H "X-Student-Id: 99999999999999999"      # []
curl -i localhost:8080/me/holds                                            # 400
```
**Commit**: `feat(backend): GET /me/holds`

## Step D4: `POST /holds/{holdId}/confirm` 🔒
**Lock order matters** (always class first, then hold) to avoid deadlocks against Apply:
```text
1. studentId = Require header                                 -> 400
2. SELECT class_id FROM holds WHERE id=@holdId                -> none: 404 HOLD_NOT_FOUND
3. BEGIN
4. SELECT 1 FROM classes WHERE id=@classId FOR UPDATE
5. SELECT status, student_id, expires_at FROM holds WHERE id=@holdId FOR UPDATE
6. student_id != header                                       -> 403 NOT_YOUR_HOLD
7. status = 'CONFIRMED'                                       -> 200 { holdId, status:"CONFIRMED" } (no change; idempotent)
8. status = 'CANCELLED'                                       -> 409 HOLD_CANCELLED
9. status = 'EXPIRED' OR (status='HELD' AND expires_at <= clock_timestamp())
                                                              -> set status='EXPIRED'; COMMIT; 409 HOLD_EXPIRED
10. status = 'HELD' and unexpired -> UPDATE status='CONFIRMED', confirmed_at=clock_timestamp(); COMMIT
11. return 200 { holdId, status:"CONFIRMED" }
```
Important: step 9 must **commit the EXPIRED update** and then return the 409 (do not throw before committing, or the rollback undoes it).

**Verify**
```bash
curl -i -X POST localhost:8080/holds/$H/confirm -H "X-Student-Id: <owner>"        # 200 CONFIRMED
curl -i -X POST localhost:8080/holds/$H/confirm -H "X-Student-Id: <owner>"        # 200 again
curl -s localhost:8080/classes/$CID | jq    # confirmedSeats is 1, NOT 2
curl -i -X POST localhost:8080/holds/$H2/confirm -H "X-Student-Id: <someone else>"   # 403
curl -i -X POST localhost:8080/holds/nope/confirm -H "X-Student-Id: <owner>"         # 404
```
Expiry case: with a 15s duration, apply, wait 16s, confirm gives `409 HOLD_EXPIRED`.
**Commit**: `feat(backend): confirm hold (idempotent, owner-only, expiry-aware)`

## Step D5: `DELETE /holds/{holdId}` 🔒
Same lock order as D4.
```text
not found                      -> 404
wrong student                  -> 403
HELD (unexpired)               -> status='CANCELLED', cancelled_at=clock_timestamp(); 204
CANCELLED                      -> 204 (idempotent)
HELD but expired / EXPIRED     -> 409 HOLD_EXPIRED   (nothing to cancel; mark EXPIRED if stale)
CONFIRMED                      -> 409 ALREADY_CONFIRMED
```
**Verify**
```bash
curl -i -X DELETE localhost:8080/holds/$H -H "X-Student-Id: <owner>"   # 204
curl -s localhost:8080/classes/$CID | jq                                # seat is available again
curl -s localhost:8080/holds/$H | jq                                    # CANCELLED
curl -i -X DELETE localhost:8080/holds/$H -H "X-Student-Id: <owner>"   # 204 again
curl -i -X DELETE localhost:8080/holds/$H -H "X-Student-Id: <other>"   # 403
```
After cancelling, the same student must be able to apply to that class again (the partial unique index only covers `HELD` and `CONFIRMED`).
**Commit**: `feat(backend): cancel hold`

## Step D6: Background expiry sweeper
**Do**: a `BackgroundService` that every 2 seconds runs
`UPDATE holds SET status='EXPIRED' WHERE status='HELD' AND expires_at <= clock_timestamp()`.
Catch and log exceptions so the service never dies. Honour the cancellation token on shutdown. It is idempotent, so running it in several processes is safe.

**Verify**: with a 15s duration, apply, wait 20s **without calling any API**, then in `psql`:
```sql
SELECT id, status FROM holds;     -- status is already EXPIRED
```
**Commit**: `feat(backend): background sweeper marks expired holds`

## Step D7: Manual concurrency smoke test (before writing automated tests)
**Do**: create `scripts/smoke-concurrency.sh`:
```bash
#!/usr/bin/env bash
# usage: ./scripts/smoke-concurrency.sh [baseUrl] [seats] [requests]
BASE=${1:-http://localhost:8080}; SEATS=${2:-20}; N=${3:-300}
CID=$(curl -s -X POST $BASE/classes -H 'Content-Type: application/json' \
  -d "{\"name\":\"Load $(date +%s)\",\"totalSeats\":$SEATS}" | jq -r .id)
seq 1 $N | xargs -P 100 -I{} sh -c \
  "curl -s -o /dev/null -w '%{http_code}\n' -X POST $BASE/classes/$CID/holds \
   -H \"X-Student-Id: \$(printf '%017d' {})\"" | sort | uniq -c
curl -s $BASE/classes/$CID | jq
```
**Verify**: output shows exactly `SEATS` lines of `201`, `N-SEATS` of `409`, and the class shows `heldSeats == SEATS`, `availableSeats == 0`. Run it several times and with `SEATS=1`.
**Commit**: `chore: manual concurrency smoke script`

---

# PHASE E: Backend automated tests

## Step E1: Test infrastructure
**Do**
```bash
cd backend
dotnet new xunit -n SchoolAdmission.Tests -f net8.0
dotnet sln add SchoolAdmission.Tests
dotnet add SchoolAdmission.Tests reference SchoolAdmission.Api
dotnet add SchoolAdmission.Tests package Microsoft.AspNetCore.Mvc.Testing --version 8.*
dotnet add SchoolAdmission.Tests package Testcontainers.PostgreSql
```
Build:
- `PostgresFixture` (`IAsyncLifetime`, `PostgreSqlBuilder().WithImage("postgres:16").Build()`), shared through an xUnit collection fixture.
- `AppFactory : WebApplicationFactory<Program>` that overrides `ConnectionStrings:Default` with the container's connection string and takes the hold duration as a constructor argument.
- To make the hold duration overridable in tests, read it from configuration (key `HOLD_DURATION_SECONDS`, which the factory can set through `UseSetting`/in-memory config) instead of only `Environment.GetEnvironmentVariable`. Environment variables are also a configuration source, so the same key works in Docker.
- Helpers: `CreateClass(client, seats)`, `Apply(client, classId, studentId)`, `StudentId(int n)` (17 digits, zero-padded).
- Each test creates its own class, so tests do not interfere.

**Verify**: add one trivial test (create class, get class) and run `dotnet test`. It must pass (Docker must be running).
**Commit**: `test(backend): test infrastructure with Testcontainers`

## Step E2: Concurrency test (mandatory) 🔒
**Do**: class with 20 seats; 200 parallel applies, each with a distinct student, started together (`Task.WhenAll` after a `TaskCompletionSource` gate so they really overlap). Assert:
- exactly 20 responses are `201`, 180 are `409`;
- `GET /classes/{id}`: `heldSeats == 20`, `confirmedSeats == 0`, `availableSeats == 0`, and `held + confirmed <= total`.

Also add a mixed variant: 30 seats; parallel applies plus parallel confirms and cancels on the winners. Assert `held + confirmed <= total` throughout and at the end.
**Commit**: `test(backend): concurrency test for seat holds`

## Step E3: Duplicate-student test
**Do**: same student, 20 parallel applies to one class. Exactly one `201`; the rest are `409`. Second test: the same student can apply to two different classes.
**Commit**: `test(backend): one active application per student per class`

## Step E4: Confirm idempotency and rules
**Do**
- Confirm 10× in parallel with the owner: all `200`, `confirmedSeats == 1`.
- Another student's confirm gives `403`.
- Confirming a cancelled hold gives `409`.
**Commit**: `test(backend): confirm is idempotent and owner-only`

## Step E5: Expiry test
**Do**: factory with `HOLD_DURATION_SECONDS=2`. Class with 1 seat. Student A applies; student B gets `409`. Wait 3s. Assert:
- `GET /holds/{A}` is `EXPIRED`;
- the class shows `availableSeats == 1`;
- student B can now apply (`201`);
- confirming A's hold gives `409`.
**Commit**: `test(backend): expired holds release seats`

## Step E6: Cancel and validation tests
**Do**
- Cancel frees the seat, and a second cancel is `204`.
- Cancel of a confirmed hold is `409`.
- Cancel by another student is `403`.
- Bad student ID is `400`; missing header is `400`.
- `totalSeats` of 0, -1, and a string are `400`; an empty name is `400`.
- Unknown class and unknown hold are `404`.
- Response shape test: `POST /holds` response contains `holdId, classId, studentId, status, expiresAt` (end with `Z`); `GET /classes` contains `heldSeats, confirmedSeats, availableSeats`.
**Commit**: `test(backend): cancel, validation and contract tests`

## Step E7 ⭐: Two-instance test (bonus)
**Do**: create two `AppFactory` instances against the same Postgres container. Create a class with 20 seats through instance 1, then fire 100 applies alternating between the two clients. Assert exactly 20 succeed.
**Commit**: `test(backend): two app instances share one database safely`

**Phase E done when**: `dotnet test` is green, at least 3 tests pass, and one is the concurrency test. Run it 3 times in a row to catch flakiness.

---

# PHASE F: Backend in Docker

## Step F1: Backend Dockerfile
**Do** `backend/Dockerfile`:
```dockerfile
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY SchoolAdmission.sln ./
COPY SchoolAdmission.Api/*.csproj SchoolAdmission.Api/
COPY SchoolAdmission.Tests/*.csproj SchoolAdmission.Tests/
RUN dotnet restore
COPY . .
RUN dotnet publish SchoolAdmission.Api -c Release -o /app --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
COPY --from=build /app .
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080
ENTRYPOINT ["dotnet", "SchoolAdmission.Api.dll"]
```
Add `backend/.dockerignore` (`bin/`, `obj/`).

**Verify**
```bash
docker build -t admission-api ./backend
```
**Commit**: `feat(backend): Dockerfile`

## Step F2: Add the backend to compose
**Do**: add the service to `docker-compose.yml`:
```yaml
  backend:
    build: ./backend
    depends_on:
      db:
        condition: service_healthy
    environment:
      ConnectionStrings__Default: "Host=db;Port=5432;Database=admission;Username=admission;Password=admission"
      HOLD_DURATION_SECONDS: "600"
    ports:
      - "8080:8080"
    restart: unless-stopped
```
**Verify**
```bash
docker compose up --build -d
curl -s localhost:8080/health
./scripts/smoke-concurrency.sh          # against the containerised backend
```
**Persistence check (required by the brief)**
```bash
curl -s -X POST localhost:8080/classes -H 'Content-Type: application/json' -d '{"name":"Persist","totalSeats":5}'
docker compose down            # NOT -v
docker compose up -d
curl -s localhost:8080/classes | jq    # "Persist" is still there
```
**Commit**: `feat: run backend in compose`

---

# PHASE G: Frontend (develop with `npm run dev` against the Docker backend)

Keep `docker compose up -d db backend` running while you build the UI.

## Step G1: Scaffold and runtime config
**Do**
```bash
npm create vite@latest frontend -- --template react-ts
cd frontend && npm install
```
- Remove the template boilerplate (logo, counter).
- Create `public/config.js`: `window.__CONFIG__ = { API_URL: "http://localhost:8080" };` and load it in `index.html` with `<script src="/config.js"></script>`. In Docker this file is regenerated at container start from the `API_URL` env var (Step H1).
- `src/config.ts`: `export const API_URL = window.__CONFIG__?.API_URL ?? import.meta.env.VITE_API_URL ?? "http://localhost:8080";` (declare the `window.__CONFIG__` type).

**Verify**: `npm run dev` shows a page, and `console.log(API_URL)` prints the right URL.
**Commit**: `feat(frontend): scaffold Vite React app with runtime config`

## Step G2: API client with friendly errors 🔒
**Do** `src/api/client.ts` and `src/api/types.ts`:
- Types: `SchoolClass`, `Hold`, `MyHold`, `ApiError`.
- A single `request<T>(method, path, { studentId, body })` that:
  - adds `Content-Type` and `X-Student-Id` when given;
  - on network failure (`fetch` throws) throws `ApiClientError("NETWORK", "Can't reach the server. Please check your connection and try again.")`;
  - on non-2xx parses `{ error, message }`, maps known codes to friendly text, and falls back to a generic message for 5xx or unparseable bodies;
  - handles `204` (no body);
  - records the server time offset from the `Date` response header (`serverOffsetMs = Date.parse(dateHeader) - Date.now()`) and exports `serverNow()`.
- Functions: `createClass`, `listClasses`, `getClass`, `applyForSeat`, `getHold`, `confirmHold`, `cancelHold`, `myHolds`.
- Friendly message map:

| Code | Message |
|---|---|
| `NO_SEATS_AVAILABLE` | No seats are left in this class. |
| `ALREADY_APPLIED` | You already have an application in this class. |
| `HOLD_EXPIRED` | Your hold has expired. Please apply again. |
| `HOLD_CANCELLED` | This application was cancelled. |
| `ALREADY_CONFIRMED` | This admission is already confirmed. |
| `NOT_YOUR_HOLD` | This application belongs to another student. |
| `INVALID_STUDENT_ID` | Birth registration number must be exactly 17 digits. |
| `INVALID_REQUEST` | Use the server's `message`. |
| `NETWORK` / 5xx | Can't reach the server. Please try again. |

**Verify**: temporarily call `listClasses()` from `App.tsx` and log the result. Then stop the backend and confirm you get the `NETWORK` error object, not a thrown unhandled exception.
**Commit**: `feat(frontend): api client with friendly error mapping`

## Step G3: Student identity bar
**Do**
- `StudentContext` holds `studentId` and `setStudentId`; initialise from `localStorage` (wrap in try/catch); persist on change.
- `StudentIdBar` at the top: a text input (`inputMode="numeric"`, `maxLength=17`, strips non-digits), inline message "Birth registration number must be exactly 17 digits." until valid, and a "valid ✓" state.
- Expose `isValidStudentId`.

**Verify**: type letters (ignored), type 16 digits (error shown), type 17 (valid), refresh the page (ID still there), close and reopen the tab (still there).
**Commit**: `feat(frontend): student id bar with persistence`

## Step G4: App shell, tabs, error banner
**Do**
- Tabs: **Classes**, **Create class (Admin)**, **My applications**. A `useState` tab is enough, or hash routing so refresh keeps the tab.
- A global `ErrorBanner` (dismissible, `role="alert"`) fed by a small `useNotifications` hook or context. Every failed action displays here.
- Make sure there is an **error boundary** around the app so a render crash shows a message instead of a blank page.

**Verify**: switch tabs; force an error with `throw` in a component and confirm the boundary shows a message.
**Commit**: `feat(frontend): app shell, tabs, error banner and boundary`

## Step G5: Create class screen
**Do**: form with name and seat count, client-side validation (name required; seats integer ≥ 1), submit calls `createClass`, shows "Class created: <name> (<seats> seats)", clears the form, and shows server errors in the banner. Disable the button while submitting.

**Verify**: create a class and see it in `psql`; submit empty (inline error); seats `0`, `-3`, `abc`, and `1.5` (inline error, no request sent); stop the backend and submit (friendly banner).
**Commit**: `feat(frontend): create class form`

## Step G6: Class list with polling
**Do**
- `usePolling(fn, 3000)` hook: runs immediately, then every 3s, avoids overlapping requests, clears on unmount, and pauses while `document.hidden` (resume with an immediate fetch on `visibilitychange`).
- `ClassList` table: name, total, held, confirmed, available, **Apply** button. Show "Loading..." initially and "No classes yet" when empty.
- Show a subtle "Updated just now / couldn't refresh" indicator. A failed poll keeps the last data and shows a banner, not a blank list.

**Verify**: open the page, create a hold with `curl`, and watch `heldSeats` change within ~3s **without refreshing**. Stop the backend and see the error. Start it again and see it recover automatically.
**Commit**: `feat(frontend): class list with auto-refresh`

## Step G7: Apply flow
**Do**
- Apply button disabled when the student ID is invalid (tooltip: "Enter your 17-digit birth registration number first"), when `availableSeats === 0`, or while a request is running.
- On success, navigate to the Application screen for the new `holdId` (state or `#/applications/<id>`).
- On failure, show the friendly message in the banner (no seats, already applied, invalid ID).

**Verify**: apply successfully; apply twice (friendly "already applied"); fill a 1-seat class from another ID and apply (friendly "no seats"); apply with an empty ID (button disabled).
**Commit**: `feat(frontend): apply for a seat`

## Step G8: Countdown hook and Application screen 🔒
**Do**
- `useCountdown(expiresAt)`: returns `remainingMs` using `serverNow()` (so client clock skew does not matter), ticking every 250–1000 ms. Clean up the interval on unmount.
- `ApplicationCard` (route `#/applications/:holdId`):
  - loads `getHold(holdId)` on mount and re-polls every 3s so server-side changes are reflected;
  - shows class name (extra field), status badge, and for `HELD` a `mm:ss` countdown;
  - **effective status** = if stored status is `HELD` and `remainingMs <= 0` then show `EXPIRED`;
  - **Pay admission fee** enabled only if effective status is `HELD`; on click calls `confirmHold`, then refreshes;
  - **Cancel** enabled only if effective status is `HELD`; on click calls `cancelHold`, then refreshes;
  - when the countdown hits zero, trigger one immediate refetch to sync with the server;
  - for terminal states show a clear sentence ("Your admission is confirmed", "This application has expired", "This application was cancelled").

**Verify** (run the backend with `HOLD_DURATION_SECONDS=20` for development)
- Apply, watch the timer count down, and **do not touch anything**: at 0 it shows `EXPIRED` and Pay is disabled, with no refresh.
- Pay: becomes `CONFIRMED`; the class list shows confirmed +1.
- Click Pay twice quickly: confirmed is still +1.
- Cancel: becomes `CANCELLED`; the seat returns.
- Open the application URL for an unknown ID: friendly "not found" message.
- Change your system clock by a few minutes and confirm the countdown still tracks the server (skew correction).
**Commit**: `feat(frontend): application screen with countdown, pay and cancel`

## Step G9: My applications screen
**Do**: table from `myHolds(studentId)`, polled every 3s: class name, status badge, countdown for `HELD`, and a link to the Application screen. If the student ID is invalid, show "Enter your birth registration number above to see your applications." The list's status also uses the effective-status rule, so a row flips to `EXPIRED` without waiting for a poll.

**Verify**: apply to two classes and see both; refresh the page and close/reopen the tab (still shown, because the ID is in `localStorage` and the data is from the server); switch the student ID and see a different list.
**Commit**: `feat(frontend): my applications list`

## Step G10: Polish and edge cases
**Do**
- Disable buttons during in-flight requests; show a small spinner or "Working...".
- Make sure no component can render `undefined` for a null API field.
- Keep focus and accessibility basics (labels on inputs, `aria-live` on the banner).
- Make sure *every* `catch` routes to the banner. Search the code for `console.error` used as the only handler.

**Verify (full manual pass)**: go through the brief's §1.5 UI list one by one.
- [ ] Everything works without Postman or DB access.
- [ ] Expiry shows without a reload and Pay is disabled.
- [ ] Seat counts update every few seconds.
- [ ] Ongoing applications survive refresh and browser reopen.
- [ ] Errors for no seats, expired, invalid input and server down are all readable.

**Commit**: `feat(frontend): polish, accessibility and error coverage`

---

# PHASE H: Frontend in Docker, full stack

## Step H1: Frontend Dockerfile, nginx and runtime config
**Do**
`frontend/nginx.conf`:
```nginx
server {
  listen 80;
  root /usr/share/nginx/html;
  index index.html;
  location / { try_files $uri /index.html; }
  location = /config.js { add_header Cache-Control "no-store"; }
}
```
`frontend/docker-entrypoint.sh` (make it executable):
```sh
#!/bin/sh
set -e
echo "window.__CONFIG__ = { API_URL: \"${API_URL:-http://localhost:8080}\" };" > /usr/share/nginx/html/config.js
exec nginx -g 'daemon off;'
```
`frontend/Dockerfile`:
```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh
ENV API_URL=http://localhost:8080
EXPOSE 80
ENTRYPOINT ["/docker-entrypoint.sh"]
```
Add `frontend/.dockerignore` (`node_modules`, `dist`).

**Verify**: `docker build -t admission-web ./frontend && docker run --rm -p 3000:80 -e API_URL=http://localhost:8080 admission-web`, open `http://localhost:3000`, and confirm the UI talks to the backend. View `http://localhost:3000/config.js` to see the injected URL. Re-run with a different `API_URL` and confirm it changes with no rebuild.
**Commit**: `feat(frontend): Dockerfile with runtime-configurable API URL`

## Step H2: Complete compose
**Do**: add to `docker-compose.yml`:
```yaml
  frontend:
    build: ./frontend
    depends_on:
      - backend
    environment:
      API_URL: "http://localhost:8080"
    ports:
      - "3000:80"
    restart: unless-stopped
```
**Verify (clean-room test, as the graders will do it)**
```bash
docker compose down -v
docker compose up --build
# open http://localhost:3000
```
Walk through the whole checklist in Step H3.
**Commit**: `feat: full stack in docker compose`

## Step H3: End-to-end acceptance checklist
- [ ] `docker compose up --build` from a fresh clone works with nothing but Docker.
- [ ] Create a class in the UI and see it listed.
- [ ] Apply, see the countdown, and see the held count rise within ~3s.
- [ ] Apply twice with the same ID, and see a friendly error.
- [ ] Pay, see `CONFIRMED`, and press Pay again with no extra confirmed seat.
- [ ] Let a hold expire (`HOLD_DURATION_SECONDS=20` in compose temporarily): the UI shows `EXPIRED` with no reload and the seat is back.
- [ ] Cancel frees the seat.
- [ ] Refresh and reopen the browser: ID and applications are still there.
- [ ] `docker compose down`, then `up` (no `-v`): the data is all still there.
- [ ] Stop only the backend (`docker compose stop backend`): the UI shows a friendly message, not a blank page. Start it again and the UI recovers.
- [ ] Reset `HOLD_DURATION_SECONDS` to `600` before the final commit.
- [ ] Contract check against §1.4: compare field names in `curl` output with the brief for all 8 endpoints, and check that timestamps end in `Z`.

---

# PHASE I ⭐: Frontend tests (bonus)

## Step I1: Test setup
```bash
cd frontend
npm i -D vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event msw
```
Configure Vitest (`environment: 'jsdom'`, `setupFiles`), and add `"test": "vitest run"` to `package.json`.
**Verify**: one trivial test passes with `npm test`.
**Commit**: `test(frontend): vitest setup`

## Step I2: Tests
- Student ID validation (accepts 17 digits, rejects 16 and letters).
- `ApplicationCard`: with fake timers, advance past `expiresAt` and assert the `EXPIRED` text and that the Pay button is disabled.
- API client: a `409 NO_SEATS_AVAILABLE` produces the friendly message; a network failure produces the "Can't reach the server" message.
- `ClassList`: renders the seat counts from a mocked response, and Apply is disabled when `availableSeats` is 0.
**Commit**: `test(frontend): validation, countdown and error tests`

---

# PHASE J ⭐: Multi-process bonus and load test

## Step J1: Two backend processes, one database
**Do**: with Postgres running, start two backend processes locally:
```bash
ASPNETCORE_URLS=http://localhost:8080 dotnet run --project backend/SchoolAdmission.Api &
ASPNETCORE_URLS=http://localhost:8081 dotnet run --project backend/SchoolAdmission.Api &
```
Create a class through 8080, then run a load script that alternates requests between the two ports (adapt `smoke-concurrency.sh` to take two base URLs, or run it twice in parallel against each URL using the same class ID).

**Verify**: total `201`s equal `totalSeats`; `GET` from both ports shows identical counts and `held + confirmed == totalSeats`.
**Commit**: `chore: multi-instance load script`

## Step J2: Bigger load run
**Do**: 1000 requests, concurrency 200, class of 50 seats. Check there are zero `5xx` responses and exactly 50 `201`s. If you see `5xx` or connection errors, check the Npgsql pool size (`Maximum Pool Size=200` in the connection string) and request timeouts.

---

# PHASE K: Documentation

## Step K1: README.md
- What it is (2 lines).
- **Run**: `docker compose up --build`.
- **URLs**: Frontend `http://localhost:3000`, API `http://localhost:8080`, Postgres `localhost:5432`.
- Env vars table: `HOLD_DURATION_SECONDS` (default 600), `ConnectionStrings__Default`, `API_URL` (frontend).
- **Data**: persists in the `pgdata` volume. `docker compose down` keeps it, `docker compose down -v` deletes it.
- **Tests**: backend `cd backend && dotnet test` (needs Docker for Testcontainers); frontend `cd frontend && npm test`.
- API summary table of the 8 endpoints with the status codes you chose.
- Quick demo flow (a few lines).

## Step K2: ASSUMPTIONS.md (short, each with a reason)
- Identity is header only; validated as 17 digits; no auth (per the brief). CORS is open for the same reason.
- Class names need not be unique.
- Seats and classes cannot be edited or deleted (not in the brief).
- Hold timing uses the DB clock; the seat returns exactly at `expires_at`; the sweeper only tidies status.
- Status codes and rules chosen: `403` for another student's hold; `409` for an expired confirm; cancelling a `CONFIRMED` admission is `409`; cancelling twice is `204`; confirming twice is `200`.
- Expired or cancelled applications do not block applying again to the same class.
- `GET /holds/{id}` has no ownership check because the brief shows no header there.
- Payment is simulated.
- **Concurrency and multi-process safety** (bonus): per-class `SELECT ... FOR UPDATE` inside a transaction serialises applies, confirms and cancels per class; the lock lives in Postgres, so any number of backend processes is safe; the DB clock (`clock_timestamp()`) avoids clock skew; a partial unique index is the backstop for one active application per student per class; confirm is idempotent because seat counts are derived from rows, not a mutable counter.

## Step K3: AI_USAGE.md (short and honest)
- Tool: Claude Code. Used for: planning, boilerplate, test drafts, review of locking and SQL.
- **Real mistakes you hit and how you caught them.** Write these down as they happen during the build. Only list real ones. Things to watch for: `now()` versus `clock_timestamp()`; `DateTimeOffset` JSON not ending in `Z`; `\d` matching non-ASCII digits; an expired confirm rolling back its own `EXPIRED` update; the frontend API URL baked at build time; the Docker network hostname used in the browser.

**Commit**: `docs: README, ASSUMPTIONS, AI_USAGE`

---

# PHASE L: Final checks and submission

- [ ] Remove any temporary endpoints (`/debug/config`, `/tmp`).
- [ ] `HOLD_DURATION_SECONDS` in compose is `600`.
- [ ] `git log --oneline` shows many incremental commits.
- [ ] `assignment-brief.md` is not tracked (`git ls-files | grep assignment`).
- [ ] Fresh clone test: `git clone <repo> /tmp/check && cd /tmp/check && docker compose up --build`, then walk the Step H3 checklist.
- [ ] `dotnet test` green; `npm test` green (if you did the bonus).
- [ ] The repo is **public** on your GitHub account.
- [ ] Submit the repo link at https://q-rp.com/c/4CXx **before 11:59:59 PM**. Pushes after the deadline do not count.

---

# Time-boxed order if you are short on time

1. A, B, C, D (working API). Then F (Docker). *Graders hit the API directly.*
2. E1–E6 (required tests).
3. G, H (UI with every required behaviour).
4. K (docs).
5. E7 and J (multi-process bonus: almost free with this design, but verify it).
6. I (frontend tests).
