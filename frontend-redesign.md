# Frontend Redesign: The Imperial School

Turn the working-but-plain admission UI into a polished, sellable product with the feel of a prestigious boarding school. The admission features stay exactly as they work today. They just look the part, and they sit **right at the front** of the page.

> **Read first: the deadline is tonight.** The current UI already meets every requirement in the brief. Do this on a separate git branch (`git switch -c redesign`) and merge it only if every check in [§9](#9-acceptance-checklist) passes. If time runs out, submit `main` as it is.

---

## 1. Ground rules (do not break these)

1. **No backend or API changes.** Everything here is frontend only.
2. **All 55 frontend tests stay green** (`cd frontend && npm test`). Do not edit a test to make it pass unless the change is deliberate and listed in §8.
3. **Keep every UI contract in §8**: the same labels, button names, test IDs, `role="alert"` messages and routes.
4. **Every existing behaviour keeps working:** live seat counts every 3 s, the countdown flips to `EXPIRED` and disables Pay with no reload, friendly errors, the student ID remembered across reloads, and the error boundary.
5. **No new runtime services.** No login, payment gateway, email or file uploads. Extra features use static content or the existing API data.
6. **No external images or CDNs at runtime.** The crest and decorations are inline SVG or CSS, fonts are self-hosted, and the app works offline once loaded.
7. All extra content is **clearly fictional** (made-up names, numbers and dates) and lives in one file, so it is easy to replace.

---

## 2. Brand

| | |
|---|---|
| Name | **The Imperial School** |
| Tagline | *Excellence, Character, Service.* (Latin motto under the crest: *Virtus et Scientia*) |
| Feel | An old, confident, well-funded boarding school: calm, spacious, gold on deep navy, serif headings, nothing loud. |
| Voice | Formal but warm, short sentences. "Reserve a place", "Admission confirmed", "Registrar's Office". Error messages stay plain and kind; the friendly wording from the API client is reused as-is. |
| Crest | Inline SVG shield: navy field, thin gold border, a gold laurel wreath around a serif "I", with a small crown above. One component, `<Crest size={...} />`, used in the header, footer, favicon and admission letter. |

---

## 3. Visual system

Put every value below in CSS variables on `:root` in `src/styles/tokens.css`. Components only ever use the variables.

### Colour (dark navy theme)

| Token | Value | Use |
|---|---|---|
| `--navy-950` | `#060D1F` | page background |
| `--navy-900` | `#0A1630` | header, footer, sections |
| `--navy-800` | `#0F2247` | cards, panels |
| `--navy-700` | `#163063` | raised cards, table header, hover |
| `--navy-600` | `#1F3F7A` | borders on hover, focus fill |
| `--line` | `rgba(201,167,90,0.18)` | hairline gold borders |
| `--gold-500` | `#C9A75A` | primary buttons, accents, active tab |
| `--gold-300` | `#E3C98A` | hover on gold, highlights |
| `--ivory` | `#F5F0E6` | main text, headings |
| `--muted` | `#A9B4CC` | secondary text |
| `--success` | `#5CC29A` | CONFIRMED, "places available" |
| `--warning` | `#E6B85C` | HELD, "filling fast" |
| `--danger` | `#EF8A8A` | errors, CANCELLED, "full" |
| `--neutral` | `#8C97AE` | EXPIRED |

- Status badges: a tinted background (the colour at about 15% opacity) with the colour as text, never white text on a bright fill.
- **Contrast:** body text ≥ 4.5:1 against its background, large headings ≥ 3:1. `--ivory` and `--muted` on `--navy-900` both pass. Check gold text on navy wherever it is used.

### Type

- Headings: **Cormorant Garamond** (600/700), self-hosted with `@fontsource/cormorant-garamond`.
- Body and UI: **Inter** (400/500/600), via `@fontsource/inter`.
- Countdown and seat numbers: Inter with `font-variant-numeric: tabular-nums`, so the digits don't jump.
- Scale: 13 / 15 (body) / 17 / 20 / 26 / 34 / 48 (hero) px. Small-caps letter-spaced eyebrow labels (e.g. `ADMISSIONS 2027`) in gold.

### Shape, space, motion

- Radius 6 px (inputs, buttons), 12 px (cards). Spacing on a 4 px grid, with generous section padding (96 px desktop, 56 px mobile).
- Shadows: soft and dark (`0 10px 30px rgba(0,0,0,.35)`) plus a 1 px gold hairline border on key cards.
- Motion: 150–200 ms fades and slides only. The countdown ring animates smoothly. Everything decorative switches off under `prefers-reduced-motion`.
- Icons: inline SVG, 1.5 px stroke, in one `icons.tsx` file. No icon library.

---

## 4. Layout and navigation

### Routes (hash routing, as today)

| Route | Screen | Status |
|---|---|---|
| `#/` | **Home**: hero with the Admissions Portal, live places, then school sections | new (becomes the default) |
| `#/classes` | **Places board**: full table of every class with Apply | keep |
| `#/applications/:id` | **Your reservation**: countdown, Pay, Cancel | keep |
| `#/mine` | **My applications** | keep |
| `#/create` | **Registrar's Office (Admin)**: create class | keep |

Unknown hashes go to Home. `#/classes`, `#/mine`, `#/create` and `#/applications/:id` must keep working exactly as now.

### Header (sticky, on every page)

- A thin top bar in `--navy-950`: "Admissions for 2027 are now open", a phone number and an email (all fictional).
- Main bar: crest and "The Imperial School" on the left. Nav: **Home · Places & Apply · My Applications · Registrar (Admin)**. On the right is the **student ID pill**, a compact version of the current `StudentIdBar`. The full field with its validation message appears in the Admissions Portal on Home and in a popover from the pill on other pages.
- Mobile: the nav collapses into a menu button, and the student ID stays reachable.

### Footer

The crest and motto, then fictional address, phone and email, quick links, "Visit us" hours, and © 2026 The Imperial School. A small line: *"Demo product. School details are illustrative."*

---

## 5. Pages

### 5.1 Home (`#/`): the real features come first

The first screen a visitor sees, on a laptop and with no scrolling, must let them **enter their number and apply**.

1. **Hero:** split in two.
   - Left: eyebrow `ADMISSIONS 2027`, headline *"A place at Imperial begins here."*, one line of copy, and two buttons: **Reserve a place** (gold, scrolls to Live places) and **My applications** (outline).
   - Right: the **Admissions Portal** card, the most important element on the site. It holds the student ID field (the real `StudentIdBar`, unchanged in behaviour), then three big tiles: **Browse places & apply** → `#/classes`, **My applications** → `#/mine` (with a count badge from `/me/holds`), and **How admission works** → the timeline below.
2. **Admissions at a glance** (bonus B1): four live numbers from `GET /classes`.
3. **Live places:** the first six classes as cards (bonus B2), each with its own **Apply** button and a "See all places" link to `#/classes`. The list refreshes every 3 s like today, reusing `listClasses` and `usePolling`.
4. **How admission works** (bonus B4).
5. Below that, the school sections: Houses (B5), Fees (B8), News (B6), FAQ (B7) and Visit us.

### 5.2 Places board (`#/classes`)

- The page title "Places & Apply" with a gold eyebrow, then search and filters (bonus B3).
- **Keep it a real `<table>`** with the same column order (name, total, held, confirmed, available, action), so tests and screen readers keep working. Restyle it: navy rows, gold hairlines, sticky header, the availability bar (B2) inside the name cell under the class name, and the Apply button on the right.
- The "Couldn't refresh, numbers may be out of date" warning keeps its `data-testid="refresh-error"`, styled as a slim amber strip above the table.

### 5.3 Your reservation (`#/applications/:id`)

The moment that sells the product, so give it the most care.

- A centred card on a subtle navy pattern: the class name as a serif heading, the student ID, and a **status badge**.
- **HELD:** a large **countdown ring** (SVG circle whose stroke shrinks as time runs out; gold, turning amber in the last minute). The digits in the middle keep `data-testid="countdown"`. The line beneath reads "Your place is reserved until 10:42 (local time)." Below that sit the gold **Pay admission fee** button and the subtle outline **Cancel application** button.
- **A small step tracker** across the top: Applied → Reserved → Paid → Confirmed, with the current step highlighted.
- **CONFIRMED:** the card turns into an "Admission confirmed" state with a gold seal, plus bonus B9 (admission letter) and B10 (copy reference).
- **EXPIRED and CANCELLED:** calm grey or rose states with the existing sentences (`data-testid="terminal-text"`) and a **Browse places** button.
- All existing hints stay: "Enter your 17-digit…", "belongs to student…", and the not-found message.

### 5.4 My applications (`#/mine`)

- Responsive cards, or a styled table on desktop: class name, status badge, live countdown for HELD, and an **Open** button. Keep the empty state (`data-testid="no-applications"`) and the "enter your number" hint (`data-testid="id-hint"`), restyled with a crest watermark.

### 5.5 Registrar's Office (`#/create`)

- Title "Registrar's Office", a note that this is an admin area (no login in this demo), and the same form (labels "Class name" and "Total seats", button "Create class") in an elegant card. A side panel with tips on how to name shifts, e.g. "Class 6 - Morning Shift".
- After creating a class, show the existing success line plus a link to the Places board.

### 5.6 Messages

- The notice banner becomes a toast in the top right: navy card with a coloured left border. It **keeps `role="alert"` for errors and `role="status"` for info, `data-testid="notice"`, and the dismiss button**. Errors still stay until dismissed; info still fades after 6 s.
- The error boundary fallback is restyled to match, with the crest and the same two buttons.

---

## 6. Bonus features (front-end only, about 2 hours in total)

Build them in this order. Each one stands alone, so stop whenever the time is up. The time is a rough estimate for one person with the redesign already in place.

| # | Feature | Data | Time | Done when |
|---|---|---|---|---|
| **B1** | **Admissions at a glance**: four live stat tiles (classes open, total places, places still available, admissions confirmed) | sums over `GET /classes` (already polled) | 15 min | Numbers match the Places board and update without a reload |
| **B2** | **Availability bar and badge** on every class: a thin bar for seats in use, plus a badge: *Places available* (> 30% left), *Filling fast* (≤ 30%), *Last few places* (≤ 5), *Full* | the class's own counts | 15 min | Correct badge at 100%, 30%, 5 and 0 seats left |
| **B3** | **Search and filter** on the Places board: text search by class name, "Only show classes with places" toggle, sort by name or most available | client-side over the list | 20 min | Filters survive the 3 s refresh; a clear empty state when nothing matches |
| **B4** | **How admission works** timeline: 1 Enter birth registration number → 2 Reserve a place → 3 Pay within the hold time → 4 Admission confirmed | static | 10 min | Shown on Home and linked from the portal |
| **B5** | **The Houses**: four houses with a colour, a small SVG crest and a one-line motto (e.g. Windsor, Kensington, Balmoral, Sandringham) | static | 15 min | Responsive grid of four cards |
| **B6** | **News & events**: three dated items (Open Day, Founders' Day, Scholarship results) | static | 10 min | Cards with date, title, two-line summary |
| **B7** | **FAQ**: six questions, including how long a place is held, what happens if I don't pay in time, and whether I can apply to two shifts | static, native `<details>` | 10 min | Keyboard-accessible, one open at a time is fine |
| **B8** | **Fee schedule**: a small table by level (admission fee, tuition per term, boarding) | static | 10 min | Labelled clearly as illustrative |
| **B9** | **Printable admission letter** on CONFIRMED: a "Download admission letter" button opens a letter-style view (crest, date, student ID, class, reference, signature line) and calls `window.print()`, with print CSS that hides the rest of the site | the confirmed hold | 20 min | Print preview shows only the letter, on white, readable |
| **B10** | **Copy application reference**: a copy button next to the hold ID on the reservation page, confirmed by a toast | the hold ID | 5 min | Works; falls back gracefully if the clipboard is blocked |

Total ≈ 130 min. If short on time, B1, B2, B4, B9 and B10 give the most value per minute.

**Do not build**, because they need a backend or are out of scope: login, real payments, email or SMS, document uploads, editing or deleting classes, a CMS.

---

## 7. Code structure

Keep all current logic. Change only presentation, and add the new pieces.

```
frontend/src/
  styles/
    tokens.css          design tokens (§3)
    base.css            reset, typography, focus rings, utilities
    print.css           admission letter print rules (B9)
  content/
    site.ts             ALL fictional content: contact, houses, news, FAQ, fees, timeline
  components/
    brand/Crest.tsx, icons.tsx
    layout/Header.tsx, TopBar.tsx, Footer.tsx, StudentIdPill.tsx
    home/HomePage.tsx, AdmissionsPortal.tsx, StatsStrip.tsx (B1), LivePlaces.tsx,
         Timeline.tsx (B4), Houses.tsx (B5), News.tsx (B6), Faq.tsx (B7), Fees.tsx (B8)
    ui/Button.tsx, Card.tsx, Badge.tsx, AvailabilityBar.tsx (B2), CountdownRing.tsx, StepTracker.tsx
    ClassList.tsx           restyled; adds B2/B3; still a <table>
    ApplicationPage.tsx     restyled; ring, tracker, B9, B10
    AdmissionLetter.tsx     (B9)
    MyApplications.tsx, CreateClassForm.tsx, StudentIdBar.tsx, NoticeBanner.tsx, ErrorBoundary.tsx  (restyled)
  lib/availability.ts       B2 badge rule, unit-tested
```

- Put reusable logic in `lib/` with small unit tests: the B2 thresholds and the B1 sums.
- Do not change `api/client.ts`, the contexts or the hooks, except `useHashRoute` gaining the `home` route.
- New npm packages: only `@fontsource/cormorant-garamond` and `@fontsource/inter`.

---

## 8. Contracts the tests rely on (must not change)

| Kind | Must stay exactly |
|---|---|
| Labels | `Student birth registration number`, `Class name`, `Total seats` |
| Button names | `Apply`, `Full` (full class), `Create class`, `Pay admission fee`, `Cancel application`, plus the dismiss button on notices |
| Test IDs | `status`, `countdown`, `terminal-text`, `refresh-error`, `notice`, `created`, `id-hint`, `no-applications`, `held`, `confirmed`, `available` |
| Roles | errors in `role="alert"`, info in `role="status"` |
| Texts matched by tests | `Valid`, `must be exactly 17 digits (16/17)`, `Please enter a class name.`, `Total seats must be…`, `belongs to student`, `Payment received. Your admission is confirmed.`, and the friendly API messages (`No seats are left in this class.`, `Can't reach the server…`, `Your hold has expired. Please apply again.`, `We couldn't find that application.`) |
| Structure | Places board is a `<table>` whose first five cells per row are name, total, held, confirmed, available; the Apply/Full button is in that row; the Apply button keeps its `title` tooltip when disabled |
| Routes | `#/classes`, `#/mine`, `#/create`, `#/applications/:id` |

**Allowed test change:** the default route moves from Classes to Home. If a test or check assumes an empty hash shows the class list, point it at `#/classes`.

---

## 9. Acceptance checklist

Build in this order, one commit per step, and check each before moving on.

1. Tokens, fonts, base CSS and the crest. The app looks dark navy, and **55/55 tests pass**.
2. Header, top bar, footer and the student ID pill. Navigation works on desktop and mobile.
3. Home: hero with the Admissions Portal and Live places. A visitor can enter a number and click Apply **without scrolling** at 1366×768.
4. Restyle the Places board, Reservation, My applications and Registrar pages. **55/55 tests pass.**
5. Bonus B1 to B10 in order, as time allows, each with its "done when" check from §6.
6. Final pass:
   - [ ] `npm test` green and `npm run build` clean (no type errors).
   - [ ] `docker compose up --build`, then the full flow at http://localhost:3000: create a class, apply, watch the countdown, pay, cancel, let a hold expire (set `HOLD_DURATION_SECONDS=20` temporarily), refresh and reopen the browser, stop the backend and see the friendly message.
   - [ ] Mobile width (375 px): everything usable, no sideways scrolling.
   - [ ] Keyboard only: every action reachable, visible gold focus ring.
   - [ ] `prefers-reduced-motion`: no animations except the countdown digits.
   - [ ] Print preview of the admission letter shows only the letter.
   - [ ] No console errors. No requests to external sites (check the network tab).
   - [ ] `HOLD_DURATION_SECONDS` back to `600`.
7. Merge `redesign` into `main` only if all of the above pass. Add a line to `AI_USAGE.md` about the redesign, and update the README screenshots or description if you add any.

---

## Implementation notes (what was built, and where it differs from this brief)

Built on the `redesign` branch. All ten bonus features (B1 to B10) are in. 66 frontend tests pass (the original 55, unedited, plus 11 for the availability rules), and a 65-check browser run against the real backend passes.

Places where the build deliberately departs from the text above, because the design skill's quality floor bans them outright:

| Brief said | Built instead | Why |
|---|---|---|
| A gold eyebrow label (e.g. `ADMISSIONS 2027`) above headings | No eyebrows; the top bar carries "Admissions for 2027 are now open" | Eyebrow labels above headings are banned |
| Toasts with a coloured left border | Full tinted border plus an icon | A thick one-sided coloured border is banned |
| News and Houses as "cards" | Ruled editorial lists | Rows of identical cards are the refused default |
| Portal tiles with icons | A ruled list of three links | Same reason |
| Glyph characters (check, cross, arrow) | Drawn SVG icons | Glyphs standing in for icons are banned |
| `.hero-watermark` crest | Removed | Reviewer: read as clipped leaf fragments |

Also added beyond the brief: lining numerals everywhere (Cormorant's old-style figures made "Class 11" read like "Class ıı"), a state-aware heading on the reservation page, a crest seal on a confirmed reservation, a crest favicon and page title, and phone layouts that put the student-number field on the first screen.

Design record: `DESIGN.md` (project root) and `.impeccable/design.json`.
