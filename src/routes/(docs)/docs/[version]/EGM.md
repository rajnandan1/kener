# [version]

## Overview

This folder groups routes that take a docs version slug as the first URL segment after `/docs/`. The folder name `[version]` is a SvelteKit route parameter, so `params.version` holds a slug such as `v4` or `v3`. The folder has no source files of its own.

## Subdirectories & Boundaries

- [llms.txt](./llms.txt/EGM.md): The route `/docs/<version>/llms.txt` returns a plain-text index of every page in that docs version. It returns 404 for an unknown version.
