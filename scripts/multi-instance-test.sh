#!/usr/bin/env bash
# Load test across TWO backend processes that share one database (bonus, brief §1.6).
# Checks the results itself and exits non-zero if anything is wrong.
#
#   docker compose -f docker-compose.yml -f docker-compose.multi.yml up --build -d
#   ./scripts/multi-instance-test.sh [backendA] [backendB] [seats] [requests] [parallel]
#
# Defaults: http://localhost:8080 http://localhost:8081, 50 seats, 1000 requests, 200 at a time.
# Needs only bash and curl.
set -u
A=${1:-http://localhost:8080}; B=${2:-http://localhost:8081}
SEATS=${3:-50}; N=${4:-1000}; PAR=${5:-200}

WORK=$(mktemp -d); trap 'rm -rf "$WORK"' EXIT
FAILED=0
pass() { echo "  PASS  $*"; }
fail() { echo "  FAIL  $*"; FAILED=1; }
num()  { grep -o "\"$2\":[0-9]*" <<< "$1" | head -1 | cut -d: -f2; }      # number field from JSON
str()  { grep -o "\"$2\":\"[^\"]*\"" <<< "$1" | head -1 | cut -d'"' -f4; } # string field from JSON
sid()  { printf "%017d" "$1"; }                                            # student id for request i
export A B WORK

for url in "$A" "$B"; do
  curl -sf "$url/health" >/dev/null || { echo "Backend $url is not reachable. Start it first (see top of this file)."; exit 2; }
done

CLASS=$(curl -s -X POST "$A/classes" -H 'Content-Type: application/json' \
  -d "{\"name\":\"Multi-instance test $(date +%s)\",\"totalSeats\":$SEATS}")
CID=$(str "$CLASS" id); export CID
echo "Class $CID: $SEATS seats. $N students apply, $PAR at a time, alternating between $A and $B."

# ---- 1. everyone applies at once, half through each backend --------------------------------
seq 1 "$N" | xargs -P "$PAR" -I{} bash -c '
  i={}; base=$([ $((i % 2)) -eq 0 ] && echo "$A" || echo "$B")
  code=$(curl -s -o "$WORK/apply_$i.json" -w "%{http_code}" -X POST "$base/classes/$CID/holds" \
         -H "X-Student-Id: $(printf "%017d" "$i")")
  echo "$code" > "$WORK/apply_$i.code"'

created=$(grep -lx 201 "$WORK"/apply_*.code | wc -l)
conflict=$(grep -lx 409 "$WORK"/apply_*.code | wc -l)
other=$(( N - created - conflict ))
echo
echo "1) Applications: $created got a seat (201), $conflict were turned away (409), $other other."
[ "$created" -eq "$SEATS" ]           && pass "exactly $SEATS seats were given out"           || fail "$created seats given out, expected $SEATS"
[ "$conflict" -eq $(( N - SEATS )) ]  && pass "everyone else got 409"                         || fail "expected $(( N - SEATS )) x 409"
[ "$other" -eq 0 ]                    && pass "no server errors or timeouts"                  || fail "$other responses were neither 201 nor 409"

for url in "$A" "$B"; do
  c=$(curl -s "$url/classes/$CID")
  held=$(num "$c" heldSeats); conf=$(num "$c" confirmedSeats); avail=$(num "$c" availableSeats)
  [ "$held" -eq "$SEATS" ] && [ "$conf" -eq 0 ] && [ "$avail" -eq 0 ] \
    && pass "$url reports held=$held confirmed=$conf available=$avail" \
    || fail "$url reports held=$held confirmed=$conf available=$avail"
done

# ---- 2. every winner pays TWICE at the same moment, once through each backend ---------------
for f in $(grep -lx 201 "$WORK"/apply_*.code); do
  i=$(basename "$f" .code); i=${i#apply_}
  echo "$i $(str "$(cat "$WORK/apply_$i.json")" holdId)"
done > "$WORK/winners"

while read -r i hold; do
  for base in "$A" "$B"; do echo "$i $hold $base"; done
done < "$WORK/winners" | xargs -P "$PAR" -L1 bash -c '
  curl -s -o /dev/null -w "%{http_code}\n" -X POST "$2/holds/$1/confirm" -H "X-Student-Id: $(printf "%017d" "$0")"' \
  > "$WORK/confirm.codes"

ok=$(grep -cx 200 "$WORK/confirm.codes"); total=$(wc -l < "$WORK/confirm.codes")
echo
echo "2) Payments: $total confirm calls ($SEATS winners x 2 backends, simultaneously): $ok answered 200."
[ "$ok" -eq "$total" ] && [ "$total" -eq $(( SEATS * 2 )) ] && pass "every confirm succeeded (repeat calls are harmless)" || fail "some confirms failed"
for url in "$A" "$B"; do
  c=$(curl -s "$url/classes/$CID")
  held=$(num "$c" heldSeats); conf=$(num "$c" confirmedSeats)
  [ "$conf" -eq "$SEATS" ] && [ "$held" -eq 0 ] \
    && pass "$url reports confirmed=$conf held=$held (each seat counted once)" \
    || fail "$url reports confirmed=$conf held=$held, expected confirmed=$SEATS held=0"
done

# ---- 3. the class is full: late applicants are turned away on both backends -----------------
late=$( (curl -s -o /dev/null -w "%{http_code}\n" -X POST "$A/classes/$CID/holds" -H "X-Student-Id: $(sid $((N + 1)))";
         curl -s -o /dev/null -w "%{http_code}\n" -X POST "$B/classes/$CID/holds" -H "X-Student-Id: $(sid $((N + 2)))") | sort -u)
echo
echo "3) Late applicants after the class is full:"
[ "$late" = "409" ] && pass "both backends answer 409" || fail "got: $late"

echo
if [ "$FAILED" -eq 0 ]; then echo "ALL CHECKS PASSED"; else echo "SOME CHECKS FAILED"; fi
exit "$FAILED"
