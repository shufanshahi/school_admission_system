# Trying The Imperial School admissions demo

The Imperial School is a fictional school. Everything you see (classes, places, houses, fees, news, student numbers) is made up for this demonstration, and the admission features are real: places are held, paid for, confirmed, cancelled and released exactly as they would be in production.

**Open:** http://localhost:3000

## Two student numbers to use

| Student number | What it is |
|---|---|
| `20142660000000001` | A guardian who already has a **confirmed admission** (Class 6 - Day Shift). Use it to see *My Applications* and to print the admission letter. |
| `20132660000000002` | A **fresh** guardian with no applications. Use it to try the whole flow yourself. |

Type the number into the **Admissions Portal** on the home page. It is remembered in your browser. Any other 17-digit number works too.

## Things to try

1. **See what is open.** The home page and *Places & Apply* show every class with its places left, refreshed every few seconds. Class 7 - Morning Shift is full, Class 8 - Morning Shift has three places left, and Class 6 - Morning Shift is filling fast.
2. **Reserve a place.** Enter `20132660000000002`, open *Places & Apply* and press **Apply** on any class. A countdown starts; the place is held in the student's name.
3. **Pay.** Press **Pay admission fee** (payment is simulated). The admission is confirmed and you can print an admission letter.
4. **Or cancel.** On another class, press **Cancel application**. The place goes straight back to the pool.
5. **Let one run out.** Reserve a place and leave it. When the timer reaches zero the screen changes to *Expired* by itself, with no refresh, and the place is released. (Holds last 10 minutes by default; the length is the `HOLD_DURATION_SECONDS` setting in `docker-compose.yml`.)
6. **Try to break it.** Apply twice to the same class, apply to a full class, enter a student number with 16 digits, or stop the backend (`docker compose stop backend`). Each case shows a clear message instead of an error page.
7. **Add a class.** *Registrar (Admin)* creates a new class with its own places. There is no login in this demonstration.

## Starting again from the clean demo data

Anything you do is saved. To put the demo back exactly as it started:

```bash
./scripts/seed-demo.sh --reset
```

This deletes **every** class and application, asks you to type `yes`, and then recreates the 14 classes and 671 confirmed admissions. Without `--reset` the script only adds data to an empty system, and refuses otherwise. It needs `bash` and `curl`, and Docker for the reset.

## What the demo data looks like

14 classes for the 2027 intake, from Class 6 to Class 12, with morning and day shifts and Science, Commerce and Humanities groups, from 24 to 120 places each. 671 admissions are already confirmed, so classes are in realistic states (open, filling, nearly full, full). Only confirmed admissions are seeded, because reservations expire after 10 minutes and would make the numbers drift while you look around.
