#!/bin/sh
set -e

# Default body size limit for SvelteKit adapter-node (512K default is too small for image uploads)
export BODY_SIZE_LIMIT="${BODY_SIZE_LIMIT:-3M}"

# Index documentation into Redis when docs and Redis are both available
if [ -f /app/scripts/index-docs.ts ]; then
  if [ -n "$(printf '%s' "${REDIS_URL:-}" | tr -d '[:space:]')" ]; then
    echo "[kener] Indexing documentation into Redis..."
    node --experimental-strip-types /app/scripts/index-docs.ts || \
      echo "[kener] Warning: docs indexing failed. Continuing..."
  else
    echo "[kener] REDIS_URL is not set; skipping the docs search index."
  fi
fi

exec "$@"
