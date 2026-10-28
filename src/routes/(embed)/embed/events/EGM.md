# events

## Overview

This folder groups the event embeds under `/embed/events/`. An event is an incident or a maintenance event. The folder has no source files of its own.

## Subdirectories & Boundaries

- [live](./live/EGM.md): The page `/embed/events/live` shows the ongoing incidents and maintenance events. It reads them from the database and filters them with the query parameters `incidents`, `maintenance`, and `tags`.
