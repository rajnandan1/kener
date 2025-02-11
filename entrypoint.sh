#!/bin/sh
set -e

# Automatically set PUBLIC_WHITE_LABEL based on WHITE_LABEL
export PUBLIC_WHITE_LABEL="${WHITE_LABEL}"

# Replace shell with the given command (from CMD or runtime args)
exec "$@"