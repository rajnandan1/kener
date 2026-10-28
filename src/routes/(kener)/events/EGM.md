# events

## Overview

This folder holds the monthly events route of the default status page, under `/events/`. A named status page has its own copy in `src/routes/(kener)/[page_path]/events/`.

## Subdirectories & Boundaries

- [[MMMM]-[YYYY]](<./[MMMM]-[YYYY]/EGM.md>): `/events/{Month}-{Year}` checks the month on the server and loads the incidents and maintenance events in the browser from `POST /dashboard-apis/events-by-month`.
