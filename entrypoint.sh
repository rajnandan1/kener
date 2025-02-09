#!/bin/sh

# Automatically set PUBLIC_WHITE_LABEL based on WHITE_LABEL
export PUBLIC_WHITE_LABEL="${WHITE_LABEL}"

# Start the application
exec "$@"