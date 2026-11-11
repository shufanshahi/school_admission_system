#!/usr/bin/env bash
# Fires many parallel "apply" requests at one class and shows how many got a seat.
# usage: ./scripts/smoke-concurrency.sh [baseUrl] [seats] [requests] [parallelism]
# Pass several base URLs comma-separated to spread load across backend processes:
#   ./scripts/smoke-concurrency.sh http://localhost:8080,http://localhost:8081 20 300
set -u
BASES=${1:-http://localhost:8080}; SEATS=${2:-20}; N=${3:-300}; PAR=${4:-100}
FIRST=${BASES%%,*}

CID=$(curl -s -X POST "$FIRST/classes" -H 'Content-Type: application/json' \
  -d "{\"name\":\"Load $(date +%s)\",\"totalSeats\":$SEATS}" | jq -r .id)
echo "class $CID  seats=$SEATS  requests=$N  parallel=$PAR  targets=$BASES"

export CID BASES
seq 1 "$N" | xargs -P "$PAR" -I{} bash -c '
  IFS=, read -ra T <<< "$BASES"
  base=${T[$(( {} % ${#T[@]} ))]}
  curl -s -o /dev/null -w "%{http_code}\n" -X POST "$base/classes/$CID/holds" \
       -H "X-Student-Id: $(printf "%017d" {})"
' | sort | uniq -c

echo "--- final state"
curl -s "$FIRST/classes/$CID" | jq -c .
