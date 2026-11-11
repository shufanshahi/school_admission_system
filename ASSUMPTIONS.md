# Assumptions

Decisions made where the brief is open, each with the reason.

## Seats can never be oversold (and the bonus: several backend processes)

- **Every write locks the class row in PostgreSQL** (`SELECT ... FROM classes WHERE id = ? FOR UPDATE`) inside a transaction. Applying, confirming and cancelling for the same class therefore happen one at a time: count the seats in use, then insert, with nobody able to slip in between. *Reason:* the lock lives in the database, not in the app's memory, so it holds across threads **and across separate backend processes** on different ports. Different classes do not block each other.
- **First come, first served** means the order in which requests get that row lock in the database.
- **Seat counts are counted from the rows every time**, never kept in a counter. `held` = `HELD` rows whose time has not run out; `confirmed` = `CONFIRMED` rows; `available` = `total − held − confirmed`. *Reason:* nothing can drift, and confirming twice cannot count a seat twice.
- **Backstop:** a partial unique index allows only one `HELD` or `CONFIRMED` row per student per class.
- **Same lock order everywhere** (class row, then hold row), so requests cannot deadlock each other.
- **Time comes from the database clock** (`clock_timestamp()` inside the locked transactions), so several backends never disagree about whether a hold has expired.
- **Startup with several backends:** migrations run under a PostgreSQL advisory lock, so backends starting at the same moment take turns instead of colliding.
- Each backend uses at most 40 database connections, so extra load queues inside the app instead of hitting PostgreSQL's connection limit.

Tested with two backends on one database: 1000 students, 50 seats, exactly 50 succeed (`scripts/multi-instance-test.sh`, and an automated test in the backend suite).

## Holds and expiry

- A hold expires exactly at its `expiresAt`. Seat counts and every read already treat a timed-out `HELD` hold as `EXPIRED`, so the seat comes back at that moment **without any API call**. A background job also marks such rows `EXPIRED` every 2 seconds; it only tidies the stored status. *Reason:* correctness does not depend on a job running on time.
- An invalid or non-positive `HOLD_DURATION_SECONDS` falls back to the default 600, with a warning in the log. *Reason:* a typo should not create holds that expire instantly.

## Rules and status codes

- **Confirming an already confirmed application returns `200`** and changes nothing. **Cancelling an already cancelled one returns `204`.** *Reason:* a double click or a network retry should not show an error.
- **Paying after the time ran out returns `409 HOLD_EXPIRED`**; paying for a cancelled application returns `409 HOLD_CANCELLED`. *Reason:* the request conflicts with the application's current state.
- **Another student's application returns `403 NOT_YOUR_HOLD`** for confirm and cancel. *Reason:* the application exists; the caller is just not allowed to act on it.
- **A confirmed admission cannot be cancelled** (`409 ALREADY_CONFIRMED`). *Reason:* the brief describes cancelling an *application*; refunds are out of scope.
- **An expired or cancelled application does not block applying again** to the same class. A confirmed admission does. *Reason:* the brief limits a student to one *active* application *or confirmed admission* per class.
- **A student may apply to several classes at once,** including two shifts of the same grade. *Reason:* the brief only restricts the same class, and each shift is a separate class.
- **`GET /holds/{holdId}` needs no student header** and shows any application to whoever has its ID. *Reason:* the brief's contract has no header there. IDs are random GUIDs, so they cannot be guessed.

## Identity and access

- **The student ID is the `X-Student-Id` header, exactly 17 ASCII digits.** There is no login and no check that the number really exists. *Reason:* the brief says no login is needed.
- **Anyone can create classes** from the admin screen, and **CORS allows any origin**. *Reason:* there is no login in the brief; in production both would sit behind authentication.

## Classes

- Class names are trimmed, 1–200 characters, and need not be unique. Seats must be a whole number from 1 to 100,000. *Reason:* sensible limits; the brief sets none.
- Classes cannot be edited or deleted. *Reason:* not in the brief, and changing seat counts under live holds needs its own rules.
- The places board lists classes in the order they were added by default (it can also sort by name or by most places available); "My Applications" shows the newest first.

## User interface

- Seat counts and application lists refresh every **3 seconds** by polling. *Reason:* the brief asks for updates "every few seconds"; polling is simple and robust.
- The countdown follows the **server's clock** (learned from each response's `Date` header), so a wrong clock on the user's computer does not matter. Because that header has one-second precision, the screen can show `EXPIRED` up to about two seconds after the server does when a page has just loaded (it converges within a few seconds), never before. The server stays the authority: a late payment is refused with a clear message.
- The student ID is kept in the browser's `localStorage`, and applications are always loaded from the server, so they survive a refresh or reopening the browser.
- Cancel asks for confirmation first, because it gives the seat away.
- Payment is simulated: **Pay admission fee** simply confirms.

## Branding and content

- The product is branded **The Imperial School**, a fictional school invented for this demonstration. Its houses, mottos, fees, news items, address, phone number and email are made up and live in one file (`frontend/src/content/site.ts`) so they are easy to replace. The email uses the reserved `.example` domain so it can never reach a real inbox.
- The fee table, news and FAQ are static illustrations. Only the admission features (classes, places, reservations, payment, cancellation) talk to the backend.
- The printable admission letter is generated in the browser from the confirmed application. It is marked as a demonstration document and carries no legal weight.
