# API Path Segment (`/api`)

## Overview

This folder is the `/api` segment of the URL. It holds no source file and only one version folder, `v4`. A request whose raw path starts with `/api/` needs a Bearer API key even when no route matches. `src/hooks.server.ts` then returns a JSON 404 instead of the HTML error page.

## Subdirectories & Boundaries

- v4: [v4](./v4/EGM.md) - This folder holds the public REST API version 4, which manages monitors, incidents, maintenances, pages, images, and site settings with a Bearer API key. Each route writes through the controllers that the dashboard uses.
