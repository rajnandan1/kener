# incidents

## Overview

This folder holds the public incident page route, under `/incidents/`. The RSS feeds and the event lists link to these pages.

## Subdirectories & Boundaries

- [[incident_id]](<./[incident_id]/EGM.md>): `/incidents/{incident_id}` shows one incident, its active updates, and its affected monitors. It hides hidden monitors unless the user has the `monitors.read` permission.
