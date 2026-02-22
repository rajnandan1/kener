---
title: Impact on Monitoring
description: Understand incident status precedence and Event Display Settings
---

When a monitor is part of an active incident, incident impact can override realtime status shown on the status page.

## Status precedence {#status-precedence}

Kener applies status sources in this order (later overrides earlier):

`default status → realtime monitor result → incident impact → maintenance impact`

This ensures users see consistent incident/maintenance communication while checks continue in the background.

## Incident impact values {#incident-impact-values}

Set impact per monitor in an incident:

- `DOWN`
- `DEGRADED`

Use `DOWN` for full outage and `DEGRADED` for partial impact.

## Realtime checks still run {#realtime-checks-still-run}

Incident override does **not** stop monitor execution.

- Monitoring jobs still run on schedule
- Data points are still stored
- Incident impact only affects effective/public status

## Event Display Settings {#event-display-settings}

Control incident visibility at:

**Manage → Site Configurations → Event Display Settings**

These incident settings are used when Kener builds notification/event payloads for users.

### Incidents settings {#incidents-settings}

| Setting                         | Effect for users                                                         |
| ------------------------------- | ------------------------------------------------------------------------ |
| `incidents.enabled`             | Master switch. If `false`, incidents are not included in event payloads. |
| `incidents.ongoing.show`        | If `true`, ongoing incidents are included.                               |
| `incidents.resolved.show`       | If `true`, resolved incidents are included.                              |
| `incidents.resolved.maxCount`   | Maximum number of resolved incidents returned.                           |
| `incidents.resolved.daysInPast` | How far back to look for resolved incidents.                             |

### How values are applied {#how-values-are-applied}

At runtime, Kener checks these flags before querying incidents:

- If disabled, query returns no incidents.
- If enabled, only selected categories (ongoing/resolved) are fetched.
- Resolved incidents are limited by `maxCount` and `daysInPast`.

So changing these values directly changes what incident events users receive/see.

## Practical guidance {#practical-guidance}

- Keep incident impact aligned with real user impact.
- Update impact as recovery progresses.
- Use Event Display Settings to reduce noisy timelines.

## Related guides {#related-guides}

- [Incidents Overview](/docs/v4/incidents/overview)
- [Creating and Managing Incidents](/docs/v4/incidents/creating-managing)
