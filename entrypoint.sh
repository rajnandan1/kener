#!/bin/sh
set -e

# Automatically set PUBLIC_WHITE_LABEL based on WHITE_LABEL
export PUBLIC_WHITE_LABEL="${WHITE_LABEL}"

# Check if database directory is writable
if [ ! -w /database ]; then
  echo "Warning: Database directory is not writable. Attempting to fix permissions..."
  # Exit gracefully if chmod fails (we're running as non-root)
  chmod -R 750 /database /uploads || echo "Could not fix permissions, may need to run container as root initially"
fi

# Replace shell with the given command (from CMD or runtime args)
exec "$@"