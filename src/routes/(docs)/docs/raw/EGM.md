# raw

## Overview

This folder groups the raw Markdown routes under `/docs/raw/`. It has no source files of its own.

## Subdirectories & Boundaries

- [[...slug].md](./[...slug].md/EGM.md): The route `/docs/raw/<version>/<page>.md` returns the Markdown source of one docs page, with its front-matter, as `text/markdown`. It returns 404 for an unknown version or page.
