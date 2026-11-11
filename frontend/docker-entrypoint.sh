#!/bin/sh
# Writes the runtime configuration from environment variables, then starts nginx.
# This is why the backend URL can change (docker compose, -e API_URL=...) without rebuilding the image.
set -e

API_URL="${API_URL:-http://localhost:8080}"
# keep the value safe inside a JavaScript string
ESCAPED=$(printf '%s' "$API_URL" | sed 's/\\/\\\\/g; s/"/\\"/g')

printf 'window.__CONFIG__ = { API_URL: "%s" };\n' "$ESCAPED" > /usr/share/nginx/html/config.js
echo "Frontend configured to use the API at: $API_URL"

exec nginx -g 'daemon off;'
