#!/bin/sh

set -eu

HOST="${HEALTHCHECK_HOST:-127.0.0.1}"
PORT="${HEALTHCHECK_PORT:-3000}"
PATH_NAME="${HEALTHCHECK_PATH:-/api/health}"

URL="http://${HOST}:${PORT}${PATH_NAME}"

if command -v wget >/dev/null 2>&1; then
	wget --spider -q "$URL"
elif command -v curl >/dev/null 2>&1; then
	curl -fsS "$URL" >/dev/null
else
	echo "Neighter wget nor curl found"
	exit 1
fi
