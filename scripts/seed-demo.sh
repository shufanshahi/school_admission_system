#!/usr/bin/env bash
# Fills the admission system with realistic demo data for "The Imperial School" (a fictional school).
#
#   ./scripts/seed-demo.sh [baseUrl]            add demo data to an EMPTY system (default http://localhost:8080)
#   ./scripts/seed-demo.sh --reset [baseUrl]    first DELETE every class and application, then add demo data
#
# Everything is created through the real API, so the numbers obey the real rules (seats, one place per student
# per class, confirm). Only confirmed admissions are seeded: they never expire, so the numbers stay put while
# clients look around. Needs bash and curl. --reset also needs Docker (it clears the database service).
#
# All student numbers are fictional.
set -u
cd "$(dirname "$0")/.."

RESET=0; BASE="http://localhost:8080"
for arg in "$@"; do
  case "$arg" in
    --reset) RESET=1 ;;
    http*)   BASE="$arg" ;;
    *) echo "Unknown option: $arg"; exit 2 ;;
  esac
done

curl -sf "$BASE/health" >/dev/null || { echo "Backend not reachable at $BASE. Start it first: docker compose up -d"; exit 2; }

existing=$(curl -s "$BASE/classes")
if [ "$existing" != "[]" ]; then
  if [ "$RESET" -eq 1 ]; then
    echo "This will DELETE every class and application in the database behind $BASE."
    read -r -p "Type 'yes' to continue: " answer
    [ "$answer" = "yes" ] || { echo "Cancelled. Nothing was changed."; exit 1; }
    docker compose exec -T db psql -U admission -d admission -q -c "TRUNCATE holds, classes" || { echo "Could not clear the database."; exit 1; }
    echo "Old data removed."
  else
    echo "The system already has classes. Re-run with --reset to replace them (this deletes everything)."
    exit 1
  fi
fi

# ---------------------------------------------------------------------------------------------------------------
# name | places | confirmed admissions so far | usual birth year of an applicant
# Order matters: Home shows the first six, chosen to show every availability state.
# ---------------------------------------------------------------------------------------------------------------
CLASSES='Class 6 - Morning Shift|120|98|2014
Class 6 - Day Shift|100|61|2014
Class 7 - Morning Shift|80|80|2013
Class 7 - Day Shift|80|52|2013
Class 8 - Morning Shift|90|87|2012
Class 8 - Day Shift|80|34|2012
Class 9 - Science, Morning|100|71|2011
Class 9 - Commerce, Day|60|22|2011
Class 9 - Humanities, Day|50|9|2011
Class 10 - Science, Morning|80|64|2010
Class 10 - Commerce, Day|60|28|2010
Class 11 - Science, Morning|90|43|2009
Class 11 - Business Studies, Day|60|17|2009
Class 12 - Science, Morning|24|5|2008'

# Two demo guardians clients can use (fictional numbers):
DEMO_WITH_ADMISSION="20142660000000001"   # already has a confirmed admission in "Class 6 - Day Shift"
DEMO_FRESH="20132660000000002"            # no applications: use it to try the whole flow

OFFICES=(266 301 302 303 304 415 507)     # made-up registration office codes, to look like a real number

# A 17-digit birth registration number: birth year (4) + office code (3) + "00" + serial (8). Unique per class and student.
student_id() { printf '%s%s00%08d' "$1" "${OFFICES[$(( $3 % ${#OFFICES[@]} ))]}" "$(( $2 * 1000 + $3 + 100 ))"; }

seed_one() {   # classId studentId -> applies, then pays; prints FAIL on any problem
  local out hold code
  out=$(curl -s -X POST "$BASE/classes/$1/holds" -H "X-Student-Id: $2")
  hold=$(grep -o '"holdId":"[^"]*"' <<< "$out" | cut -d'"' -f4)
  [ -n "$hold" ] || { echo "FAIL apply $2: $out"; return; }
  code=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE/holds/$hold/confirm" -H "X-Student-Id: $2")
  [ "$code" = "200" ] || echo "FAIL confirm $2: HTTP $code"
}
export -f seed_one; export BASE

echo "Seeding The Imperial School at $BASE ..."
idx=0; expected_total=0; failures=0
while IFS='|' read -r name seats confirmed year; do
  idx=$((idx + 1))
  created=$(curl -s -X POST "$BASE/classes" -H 'Content-Type: application/json' -d "{\"name\":\"$name\",\"totalSeats\":$seats}")
  cid=$(grep -o '"id":"[^"]*"' <<< "$created" | cut -d'"' -f4)
  [ -n "$cid" ] || { echo "Could not create '$name': $created"; exit 1; }

  start=1
  if [ "$name" = "Class 6 - Day Shift" ]; then      # the demo guardian's admission is one of this class's confirmed places
    seed_one "$cid" "$DEMO_WITH_ADMISSION"
    start=2
  fi
  for n in $(seq "$start" "$confirmed"); do echo "$cid $(student_id "$year" "$idx" "$n")"; done \
    | xargs -P 12 -L1 bash -c 'seed_one "$@"' _ > /tmp/seed-demo.$$ 2>&1
  if [ -s /tmp/seed-demo.$$ ]; then cat /tmp/seed-demo.$$; failures=$((failures + $(wc -l < /tmp/seed-demo.$$))); fi
  expected_total=$((expected_total + confirmed))
  printf '  %-34s %3s places, %3s confirmed\n' "$name" "$seats" "$confirmed"
done <<< "$CLASSES"
rm -f /tmp/seed-demo.$$

# ---- check the result against the plan ------------------------------------------------------------------------
echo; echo "Checking..."
json=$(curl -s "$BASE/classes")
confirmed_total=0; for v in $(grep -o '"confirmedSeats":[0-9]*' <<< "$json" | cut -d: -f2); do confirmed_total=$((confirmed_total + v)); done
classes_total=$(grep -o '"totalSeats"' <<< "$json" | wc -l)
mine=$(curl -s "$BASE/me/holds" -H "X-Student-Id: $DEMO_WITH_ADMISSION")
if [ "$failures" -eq 0 ] && [ "$confirmed_total" -eq "$expected_total" ] && grep -q '"status":"CONFIRMED"' <<< "$mine"; then
  echo "OK: $classes_total classes, $confirmed_total confirmed admissions, demo guardian has a confirmed admission."
else
  echo "PROBLEM: failures=$failures, confirmed $confirmed_total (expected $expected_total)."; exit 1
fi

cat <<EOF

Demo student numbers (fictional):
  With a confirmed admission : $DEMO_WITH_ADMISSION   (Class 6 - Day Shift: see it in My Applications, print the letter)
  Fresh, to try the full flow: $DEMO_FRESH   (apply, watch the timer, pay or cancel)
EOF
