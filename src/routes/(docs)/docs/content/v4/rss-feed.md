---
title: RSS Feed
description: Public RSS 2.0 feed of recent incidents and scheduled maintenance
---

Kener exposes a public RSS 2.0 feed of incidents and scheduled maintenance so feed readers, bots, and dashboards can pick up status changes without polling the API.

## Feed URLs {#feed-urls}

| URL                    | Scope                                                        |
| ---------------------- | ------------------------------------------------------------ |
| `/rss.xml`             | Default page (root). Honors `forceExclusivity` when enabled. |
| `/{page_path}/rss.xml` | A named status page — only items for that page's monitors.   |

URLs respect `KENER_BASE_PATH`, so a deployment at `https://status.example.com/status` exposes the feed at `https://status.example.com/status/rss.xml`.

Both routes return:

- `Content-Type: application/rss+xml; charset=utf-8`
- `Cache-Control: public, max-age=300`

## What's in the feed {#whats-in-the-feed}

The feed includes incidents and maintenance events from the last 90 days, capped at 50 most-recent items, sorted by date descending.

Items inherit the same visibility rules as the events page:

- Items tied only to hidden monitors are excluded.
- Unknown `page_path` returns `404`.
- If `siteURL` is not configured, the feed returns `404`.

## Item shape {#item-shape}

| Field         | Notes                                                                                               |
| ------------- | --------------------------------------------------------------------------------------------------- |
| `title`       | `[Incident] ...` or `[Maintenance] ...`                                                             |
| `link`        | Absolute URL to `/incidents/{id}` or `/maintenances/{id}`                                           |
| `guid`        | `incident-{id}` or `maintenance-{event_id}` — stable, not a permalink                               |
| `pubDate`     | RFC-822. Incidents use latest comment time (fallback start time); maintenances use scheduled start. |
| `description` | CDATA-wrapped text: status, affected monitors, latest update or maintenance description             |

For maintenances, `{event_id}` is the maintenance **event** id (one item per recurrence), matching the URLs used elsewhere in the app.

## Verify your feed {#verify-your-feed}

```bash
curl -i https://status.example.com/rss.xml
```

You should see `200 OK`, `application/rss+xml`, and a `<channel>` block with one `<item>` per recent event.

## Related pages {#related-pages}

- [User Subscriptions](/docs/v4/subscriptions) — email-based delivery
- [Pages](/docs/v4/pages) — how page scoping works
- [Base Path Deployment](/docs/v4/guides/base-path) — `KENER_BASE_PATH` setup
