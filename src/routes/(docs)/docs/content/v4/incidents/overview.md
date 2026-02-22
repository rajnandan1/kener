---
title: Incidents Overview
description: Track service disruptions with incidents, updates, and monitor impact in Kener
---

Incidents are records for outages or degradations that affect one or more monitors. They provide a user-facing timeline of what happened, current status, and resolution progress.

## What an incident includes {#what-an-incident-includes}

Each incident has:

- Title
- Start time
- Current state
- Affected monitors and impact level (`DOWN` / `DEGRADED`)
- Updates timeline

## State lifecycle {#state-lifecycle}

Incidents typically move through:

`INVESTIGATING → IDENTIFIED → MONITORING → RESOLVED`

- **INVESTIGATING**: team is actively diagnosing
- **IDENTIFIED**: root cause is known
- **MONITORING**: fix is applied, watching stability
- **RESOLVED**: incident is closed

When an incident becomes `RESOLVED`, Kener sets the end time automatically.

## Sources {#sources}

Incidents can come from:

- **Dashboard** (manual creation)
- **Alerting** (auto-created when an alert is configured to create incidents)

## Public visibility {#public-visibility}

Open incidents appear on the public status page and incident views.

Monitor status shown to users follows incident/maintenance precedence (see impact page).

## Keep it concise for users {#keep-it-concise-for-users}

- Use a clear title
- Add only meaningful updates
- Keep impact accurate per monitor
- Resolve promptly when stable

## Related guides {#related-guides}

- [Creating and Managing Incidents](/docs/v4/incidents/creating-managing)
- [Impact on Monitoring](/docs/v4/incidents/impact-on-monitoring)
- [Alert Configurations](/docs/v4/alerting/alert-configurations)
