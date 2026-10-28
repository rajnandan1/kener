# [page_path]/events

## Overview

This folder holds the monthly events route of one named status page, under `/{page_path}/events/`. It is a copy of `src/routes/(kener)/events/`.

## Subdirectories & Boundaries

- [[MMMM]-[YYYY]](<./[MMMM]-[YYYY]/EGM.md>): `/{page_path}/events/{Month}-{Year}` checks the month on the server and loads the page's incidents and maintenance events in the browser from `POST /dashboard-apis/events-by-month`.
