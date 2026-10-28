# snippets

## Overview

This folder groups text snippets that Kener serves or shows as they are. The app does not run them as its own code.

## Subdirectories & Boundaries

- [capture](./capture/EGM.md): eight analytics vendor snippets. `GET /capture.js` fills them in from the analytics settings and serves them as one browser script.
- `embed/`: per-framework text files. `angular/`, `react/`, `svelte/`, and `vue/` each hold `code.txt` and `howto.txt`, and `html/` holds `howto.txt`. The folder holds no source code and has no EGM.md. No file in the repo loads these files today.
