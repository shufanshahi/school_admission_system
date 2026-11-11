# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Guardians (applicants):** parents/guardians applying on behalf of a student during a first-come-first-served admission window. They act under time pressure — seats are scarce and a hold expires if the fee isn't paid in time. No account/login; identity is the student's 17-digit birth registration number, entered at the top of the page and reused across visits.
- **School admin:** creates classes (each class = one shift, e.g. "Class 6 – Morning Shift") with a name and total seat count, before admission opens. No login for admin either — it's a single operator role, not a multi-tenant system.
- **Evaluators (Onnorokom Projukti):** run `docker compose up` and exercise the API directly (automated contract/concurrency tests) as well as the UI. [Inferred from `assignment-brief.md`.]

## Product Purpose

An online first-come-first-served admission portal for a private school. Guardians apply for a seat in a specific class/shift; a seat is **held** in the student's name for a configurable duration (`HOLD_DURATION_SECONDS`, default 600s). If the admission fee is paid within that window the hold becomes **confirmed**; otherwise it **expires** on its own and the seat returns to the pool — no manual intervention needed. Success means: no guardian sees overselling or data loss, and every status change (held → confirmed/expired/cancelled) is visible in the UI without a page reload.

## Positioning

This is a take-home technical assignment for an Assistant Software Engineer role at Onnorokom Projukti, not a market product — there are no competitors to differentiate against. The thing a careless implementation could not truthfully claim: **correctness under concurrency**. `held + confirmed` must never exceed `totalSeats`, even with thousands of simultaneous requests and (bonus) multiple backend instances against the same database. This is the project's core engineering claim, and it's the one graders test directly (contract tests + a required concurrency test).

## Operating Context

- **Admission-opening spike:** the defining scenario is a burst — thousands of guardians applying within seconds of admission opening for a popular class/shift. The system must stay correct (not just available) under that spike.
- **Deployment for evaluation:** the whole stack (PostgreSQL, backend, frontend) starts with a single `docker compose up` from the repo root. Backend on `http://localhost:8080`, frontend published on `http://localhost:3000` (see `docker-compose.yml`). DB connection string and `HOLD_DURATION_SECONDS` are environment-configurable; the frontend's backend URL is environment-configurable via `API_URL`.
- **No real payment:** "Pay admission fee" always succeeds — there is no real payment gateway.
- **Submission deadline:** per `assignment-brief.md` and `implementations.md`, the deadline is **11 November 2026, 11:59:59 PM** — today, per the current session date. `README.md`, `ASSUMPTIONS.md`, and `AI_USAGE.md` are listed as pending steps (K1–K3) in `implementations.md` and were not found in the repo root as of this writing.

## Capabilities and Constraints

- **Seat safety (hard constraint):** `held + confirmed` must never exceed `totalSeats` for a class, under any concurrency, including across multiple backend instances sharing one database (bonus scope). Implementation uses a per-class row lock (`SELECT ... FOR UPDATE`) inside a transaction.
- **One active application per student per class:** a student cannot hold more than one active application, or hold-and-confirm simultaneously, in the same class.
- **Confirm is idempotent:** calling confirm multiple times on the same hold increases `confirmedSeats` only once. Only the hold's own student, and only while it's still `HELD` and unexpired, may confirm it.
- **Hold lifecycle:** `HELD → CONFIRMED | EXPIRED | CANCELLED`. Expiry is time-based (`HOLD_DURATION_SECONDS`) and self-resolving — no client needs to call anything for a hold to expire; implementation combines lazy expiry checks with a background sweeper.
- **API contract is fixed:** base URL `http://localhost:8080`, JSON only, student identity via `X-Student-Id` header (the 17-digit birth registration number). The 8 endpoints and their response fields (`/classes`, `/classes/{id}`, `/classes/{id}/holds`, `/holds/{id}`, `/holds/{id}/confirm`, `/holds/{id}` DELETE, `/me/holds`) may gain extra fields but must not lose or rename any documented field — both the UI and the graders' automated tests depend on this contract.
- **Durability:** no data loss across `docker compose down` / `up` — PostgreSQL data is in a named volume.
- **No login, anywhere:** identity is purely the birth registration number; nothing else gates access to admin or guardian flows.
- **Error visibility:** every failure mode a guardian can hit (no seats left, hold expired, invalid input, server unreachable) must surface as an understandable message in the UI — never a blank page or a console-only error.
- **Live updates without reload:** class seat counts refresh every few seconds; a hold's expiry flips its displayed status and disables "Pay admission fee" without a page reload.
- **Persistence across sessions:** a guardian's in-progress applications remain visible after a page refresh or reopening the browser (identity persists via the birth-registration-number field, not a server session).

## Brand Commitments

The system is framed as belonging to a fictional school: **Greenfield Scholars' School**. This is an inferred placeholder chosen during init (not the real name of any specific institution) so that future visual work has a concrete identity to anchor to, rather than the generic working title "School Admission System." No logo, color, or typography commitments exist yet — those are visual-world decisions for `new-work`/`document`, not this file. Replace the name here if a different one is preferred.

## Evidence on Hand

None. This is a greenfield build for a take-home assignment — there are no real guardians, real classes, real payment data, testimonials, or case studies. Future work must not fabricate any of these; seed/demo data in the UI or docs should be clearly fictional.

## Product Principles

1. **Correctness over polish.** The brief is explicit: "The UI doesn't need to look beautiful. What matters is that it works correctly and is easy to use." Seat-safety and contract correctness outrank visual ambition on this project.
2. **No silent failure.** Every error a guardian or admin can cause or encounter must be explained in plain language in the UI; a blank screen or console-only error is a defect, not an edge case.
3. **Self-resolving state.** Time-based transitions (hold expiry) must happen without requiring any client or admin action — the system, not the user, is responsible for consistency.
4. **The contract is load-bearing.** The 8 documented endpoints and their response fields are consumed by automated graders as well as the UI; additive changes are fine, destructive ones break evaluation.
5. **Assume nothing silently.** Per the brief, any assumption made where the spec is silent belongs in `ASSUMPTIONS.md` with its reasoning — not just in code comments.

## Accessibility & Inclusion

No specific accessibility standard (e.g. WCAG level) is mandated by the brief. The one explicit requirement is usability-level: errors must be shown "in language the user can understand" for every failure mode listed in §1.5 — treat this as a floor, not a ceiling, when touching error/status UI.
