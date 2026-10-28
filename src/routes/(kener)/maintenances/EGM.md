# maintenances

## Overview

This folder holds the public maintenance page route, under `/maintenances/`. The RSS feeds and the event lists link to these pages.

## Subdirectories & Boundaries

- [[maintenance_id]](<./[maintenance_id]/EGM.md>): `/maintenances/{id}` shows one maintenance event, the other scheduled events of the same maintenance, and its affected monitors. The id is a maintenance event id, or a maintenance id with `?type=maintenance`. It hides hidden monitors unless the user has the `monitors.read` permission.
