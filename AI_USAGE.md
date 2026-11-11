# AI usage

## Tool

**Claude Code** (Anthropic's coding agent, running Claude models) inside VS Code.

## What it was used for

- **Planning:** turning the brief into a step-by-step plan where every step ends with a concrete check, before writing code.
- **Code:** most of the backend (endpoints, seat-locking logic, migrations, expiry job), the React UI, the Dockerfiles and compose setup.
- **Tests:** the 58 backend tests, the 55 frontend tests, and the load and multi-instance scripts.
- **Verification:** running every step against a real database and a real browser (Chrome driven by Playwright) instead of trusting that code looked right.
- **Explanations:** walking through how each part works, e.g. why the class row lock prevents overselling.

## Where the AI made mistakes, and how they were caught

| Mistake | How it was caught | Fix |
|---|---|---|
| Published PostgreSQL on host port 5432, which clashed with a PostgreSQL already installed on the machine. Migrations failed with a confusing password error. | The first migration failed. Checking what was listening on the port showed it was the wrong server. | The database is no longer published to the host; the backend reaches it over the Docker network. This also avoids the same clash on a reviewer's machine. |
| Under load the API returned **500 errors**: PostgreSQL ran out of connections ("too many clients"). Seat counts were still correct, but errors are not acceptable. | The load script showed hundreds of 500s; the server log showed the cause. | Each backend now uses at most 40 connections, so extra requests wait in the app. **The first fix did not work:** the check for "did the user set a pool size?" was always true. That was caught by measuring PostgreSQL's peak connections during the next load run: still 100, not 80. Fixed and re-measured (peak 81, zero errors). |
| Two backends starting together on an empty database **raced to create the tables**; one failed with "relation already exists". A retry loop hid it. | Reading both backends' logs during the multi-instance test. | Migrations now run under a PostgreSQL advisory lock. Three fresh starts afterwards: both backends succeed first time, no errors. |
| A malformed server answer made a screen render **empty, with no message**. | The browser test fed the UI a bad response on purpose. | The API client now checks the shape of every response and shows "The server sent an answer we couldn't understand". |
| The countdown could run **up to a second long** (the server's `Date` header only has one-second precision), and a newly opened hold briefly showed **01:31** for a 90-second hold. | Measuring the shown timer against the true time; a frontend unit test caught the 01:31. | The clock estimate now uses the best of several samples, and the countdown reads the time fresh when it renders. |
| After the server came back from an outage, the "Can't reach the server" banner **stayed on screen**. | Reviewing the browser test of a server outage. | The lists clear that banner once a refresh succeeds. |
| The AI **reported a check as passed when it had not**: after killing the backend container it printed "restarted", but that text was hard-coded and the health check had actually returned nothing. | Reading the raw command output instead of the summary. | Re-tested properly. Restart-after-crash could not be simulated without admin rights, so it is reported as **not verified** rather than passed. |
| Several mistakes in **test code**, not the app: two tests shared a student ID in the shared test database; IDs built from a timestamp could collide; a check read the page before it re-rendered; React's automatic retry swallowed a simulated crash. | Failing or suspicious test runs, investigated before changing anything. | Fixed the tests. The app was correct in each case. |

## How we made sure the tests themselves were meaningful

- **Mutation checks:** removing the class row lock (`FOR UPDATE`) made the concurrency test fail with **45 students holding seats in a 20-seat class**. Removing the "show EXPIRED at zero" rule made the frontend expiry test fail. Both were put back and the suites are green.
- Known pitfalls were planned for up front and then tested rather than assumed: PostgreSQL's `now()` returns the *transaction start* time (the locked code uses `clock_timestamp()`); .NET writes UTC offsets as `+00:00` unless handled (a contract test checks that every timestamp ends in `Z`); `\d` in .NET accepts non-ASCII digits (the validation uses `[0-9]`, and a test sends Arabic-Indic digits).
- The final setup was checked the way reviewers will run it: `docker compose up --build` from an empty database, the UI driven in Chrome, data surviving `docker compose down` and `up`, and the backend stopped mid-session.
