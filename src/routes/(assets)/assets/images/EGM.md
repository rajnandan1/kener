# images

## Overview

This folder groups the URL prefix `/assets/images/`. It has no route file of its own. Its one child serves stored images by ID.

## Subdirectories & Boundaries

- [[id]](<./[id]/EGM.md>): `GET /assets/images/[id]` reads one row from the `images` table and returns the base64-decoded bytes with a public 1-year `Cache-Control`. It needs no session.
