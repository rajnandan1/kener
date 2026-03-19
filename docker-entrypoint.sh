#!/bin/sh
set -e

# Default body size limit for SvelteKit adapter-node (512K default is too small for image uploads)
export BODY_SIZE_LIMIT="${BODY_SIZE_LIMIT:-3M}"

# Index documentation into Redis when docs are bundled in the image
if [ -f /app/scripts/index-docs.ts ]; then
  echo "[kener] Indexing documentation into Redis..."
  node --experimental-strip-types /app/scripts/index-docs.ts || \
    echo "[kener] Warning: docs indexing failed (is REDIS_URL set?). Continuing..."
fi

exec "$@"
