# assets

## Overview

This folder groups the URL prefix `/assets/`. It has no route file of its own. Its only child serves images that are stored in the database.

## Subdirectories & Boundaries

- [images](./images/EGM.md): This folder groups `/assets/images/`. Its child `[id]` serves `GET /assets/images/[id]` from the `images` table, with no session check and a public 1-year cache.
