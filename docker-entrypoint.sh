#!/bin/sh
set -e

# Default body size limit for SvelteKit adapter-node (512K default is too small for image uploads)
export BODY_SIZE_LIMIT="${BODY_SIZE_LIMIT:-3M}"

# Detect privilege-drop tool: su-exec (Alpine) or gosu (Debian)
if command -v su-exec >/dev/null 2>&1; then
  DROP="su-exec node"
elif command -v gosu >/dev/null 2>&1; then
  DROP="gosu node"
else
  DROP=""
fi

# Fix ownership of the database directory and its contents so the
# non-root "node" user can read and write.  Docker volumes are often
# initialised as root, which leaves SQLite unable to write.
if [ "$(id -u)" = "0" ]; then
  chown -R node:node /app/database
  chmod -R u+rw /app/database

  # Index documentation into Redis when docs are bundled in the image
  if [ -f /app/scripts/index-docs.ts ]; then
    echo "[kener] Indexing documentation into Redis..."
    $DROP node --experimental-strip-types /app/scripts/index-docs.ts || \
      echo "[kener] Warning: docs indexing failed (is REDIS_URL set?). Continuing..."
  fi

  # Drop to unprivileged user for the main process
  exec $DROP "$@"
else
  # Already running as non-root (e.g. docker run --user node)
  if [ -f /app/scripts/index-docs.ts ]; then
    echo "[kener] Indexing documentation into Redis..."
    node --experimental-strip-types /app/scripts/index-docs.ts || \
      echo "[kener] Warning: docs indexing failed (is REDIS_URL set?). Continuing..."
  fi

  exec "$@"
fi
