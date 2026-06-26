---
title: Sharing Monitors
description: Configure badge and embed sharing, including site-level and monitor-level controls
---

Kener supports sharing monitor data through **badges** and **embeds**, plus a **live events** embed.

## What you can share {#what-you-can-share}

### Badges {#badges}

From **Manage → Badges**, you can generate:

- Status badge
- Uptime badge
- Latency badge (`average`, `maximum`, `minimum`)
- Dot badges

You can customize style, label, colors, and time range.

### All-monitors badge {#all-monitors-badge}

Status and dot badges accept `_` instead of a monitor tag:

```
/badge/_/status
/badge/_/dot
```

The `_` badge shows the overall status of **every active, non-hidden monitor site-wide**. It is not scoped to a page, so on a multi-page setup it may not match an individual page's banner.

### Overall status priority {#overall-status-priority}

When multiple monitor statuses collapse into one overall status (the page banner and the `_` badge), the worst state wins:

`DOWN` > `DEGRADED` > `MAINTENANCE` > `UP`

> [!NOTE]
> Maintenance never masks an active problem: a page with one monitor under maintenance and another down or degraded reports the outage, not the maintenance. `NO_DATA` is shown only when no monitor has reported any data.

### Embeds {#embeds}

From **Manage → Embed**, you can generate:

- **Status Bar** embed for a monitor
- **Latency Chart** embed for a monitor
- **Live Events** embed (incidents + maintenances)

You can copy output as `iframe` or `script`.

### Live Events widget {#live-events-widget}

Live Events embed supports:

- incidents on/off
- maintenances on/off
- optional monitor tag filtering

This lets you show one combined events feed or a scoped feed for selected monitors.

## Where controls are configured {#where-controls-are-configured}

### Site-level controls {#site-level-controls}

In **Manage → Site Configurations → Monitor Sub Menu Options**:

- `showShareBadgeMonitor`
- `showShareEmbedMonitor`

These are global toggles for monitor sharing actions.

### Monitor-level controls {#monitor-level-controls}

In **Manage → Monitors → [monitor] → Sharing Options**:

- `showShareBadgeMonitor`
- `showShareEmbedMonitor`

These are saved per monitor in `monitor_settings_json.sharing_options`.

## Precedence rules (important) {#precedence-rules}

> [!IMPORTANT]
> Site-level settings override monitor-level settings.

A sharing action is visible only when **both** are enabled:

- site-level toggle is enabled
- monitor-level toggle is enabled

If site-level is disabled, monitor-level cannot re-enable it.

## How this appears on the public monitor page {#public-monitor-page-behavior}

On a monitor page, the share buttons in the top action bar are shown only when allowed by both levels:

- **Badges** menu requires site + monitor badge permission.
- **Embed** menu requires site + monitor embed permission.

## Recommended setup flow {#recommended-setup-flow}

1. Enable global sharing defaults in **Site Configurations**.
2. For sensitive monitors, disable badge/embed in monitor **Sharing Options**.
3. Use **Manage → Badges** and **Manage → Embed** to generate final snippets.
4. Verify visibility from a public monitor page.

## Related pages {#related-pages}

- [Monitors Overview](/docs/v4/monitors/overview)
- [Pages](/docs/v4/pages)
- [Configuration](/docs/v4/configuration)
