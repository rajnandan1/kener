# monitors

## Overview

This folder holds the public monitor page routes, under `/monitors/`. The sitemap, the status pages, and the incident and maintenance pages link to these pages.

## Subdirectories & Boundaries

- [[monitor_tag]](<./[monitor_tag]/EGM.md>): `/monitors/{monitor_tag}` shows one active monitor and its RSS feed. A hidden monitor gets 404 unless the user has the `monitors.read` permission.
