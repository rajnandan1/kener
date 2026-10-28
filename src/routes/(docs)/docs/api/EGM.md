# api

## Overview

This folder groups the JSON endpoints of the docs site under `/docs/api/`. It has no source files of its own. These endpoints are separate from the Kener product API under `/api/v4`.

## Subdirectories & Boundaries

- [search](./search/EGM.md): The route `GET /docs/api/search?q=<query>` returns up to 10 docs search results. It reads the search index from the Redis key `kener-docs:search:documents`.
