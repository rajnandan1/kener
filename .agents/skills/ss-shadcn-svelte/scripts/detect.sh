#!/usr/bin/env bash
set -euo pipefail

# detect.sh — Check if the current project is a SvelteKit project with shadcn-svelte installed.
# Exits 0 and prints component info if detected, exits 1 otherwise.

PROJECT_DIR="${1:-.}"

# Resolve to absolute path
PROJECT_DIR="$(cd "$PROJECT_DIR" && pwd)"

# --- Step 1: Check for SvelteKit ---

SVELTEKIT=false

# Check for svelte.config.js or svelte.config.ts
if [[ -f "$PROJECT_DIR/svelte.config.js" ]] || [[ -f "$PROJECT_DIR/svelte.config.ts" ]]; then
    SVELTEKIT=true
fi

# Also verify package.json has @sveltejs/kit
if [[ -f "$PROJECT_DIR/package.json" ]]; then
    if grep -q '"@sveltejs/kit"' "$PROJECT_DIR/package.json" 2>/dev/null; then
        SVELTEKIT=true
    fi
fi

if [[ "$SVELTEKIT" != "true" ]]; then
    echo "NOT_SVELTEKIT"
    echo "This is not a SvelteKit project. No svelte.config.js/ts found and @sveltejs/kit is not in package.json."
    exit 1
fi

# --- Step 2: Check for shadcn-svelte ---

SHADCN=false

# Check for components.json (shadcn-svelte config file)
if [[ -f "$PROJECT_DIR/components.json" ]]; then
    # Verify it's actually a shadcn config (has $schema or style field)
    if grep -qE '"(\$schema|style)"' "$PROJECT_DIR/components.json" 2>/dev/null; then
        SHADCN=true
    fi
fi

# Check for bits-ui in package.json (core dependency of shadcn-svelte)
if [[ -f "$PROJECT_DIR/package.json" ]]; then
    if grep -q '"bits-ui"' "$PROJECT_DIR/package.json" 2>/dev/null; then
        SHADCN=true
    fi
fi

# Check for shadcn-svelte in package.json
if [[ -f "$PROJECT_DIR/package.json" ]]; then
    if grep -q '"shadcn-svelte"' "$PROJECT_DIR/package.json" 2>/dev/null; then
        SHADCN=true
    fi
fi

if [[ "$SHADCN" != "true" ]]; then
    echo "NO_SHADCN_SVELTE"
    echo "SvelteKit project detected, but shadcn-svelte is not installed."
    echo "Install it with: npx shadcn-svelte@latest init"
    exit 1
fi

# --- Step 3: Gather installed components ---

echo "DETECTED"
echo "SvelteKit project with shadcn-svelte detected."
echo ""

# Check which components are already installed by scanning the components directory
COMPONENTS_DIR=""

# Try to read the components alias from components.json
if [[ -f "$PROJECT_DIR/components.json" ]]; then
    # Extract the aliases.components path
    ALIAS_PATH=$(grep -o '"components"[[:space:]]*:[[:space:]]*"[^"]*"' "$PROJECT_DIR/components.json" | head -1 | sed 's/.*"components"[[:space:]]*:[[:space:]]*"//' | sed 's/"//')

    if [[ -n "$ALIAS_PATH" ]]; then
        # Resolve $lib to src/lib
        RESOLVED_PATH="${ALIAS_PATH//\$lib/src/lib}"
        if [[ -d "$PROJECT_DIR/$RESOLVED_PATH/ui" ]]; then
            COMPONENTS_DIR="$PROJECT_DIR/$RESOLVED_PATH/ui"
        fi
    fi
fi

# Fallback: check common locations
if [[ -z "$COMPONENTS_DIR" ]]; then
    for dir in "src/lib/components/ui" "src/lib/ui" "src/components/ui"; do
        if [[ -d "$PROJECT_DIR/$dir" ]]; then
            COMPONENTS_DIR="$PROJECT_DIR/$dir"
            break
        fi
    done
fi

if [[ -n "$COMPONENTS_DIR" ]] && [[ -d "$COMPONENTS_DIR" ]]; then
    echo "Installed components (in $COMPONENTS_DIR):"
    for comp_dir in "$COMPONENTS_DIR"/*/; do
        if [[ -d "$comp_dir" ]]; then
            comp_name=$(basename "$comp_dir")
            echo "  - $comp_name"
        fi
    done
    echo ""
fi

echo "Documentation: https://www.shadcn-svelte.com/llms.txt"
