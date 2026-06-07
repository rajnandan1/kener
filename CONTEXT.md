# Kener

An open-source status page application providing real-time monitoring, uptime tracking, incident management, and customizable dashboards.

## Language

### Monitoring

**Monitor**:
A single check against a service, with a unique tag, a type (API, Ping, TCP, DNS, SSL, SQL, Heartbeat, GameDig, Group, gRPC, None), and a status (ACTIVE or otherwise).
_Avoid_: Check, probe, service

**Inactive Monitor**:
A monitor that is not checked at all: the scheduler drops its job and no monitoring data is collected until it is made ACTIVE again. Independent of visibility (see Hidden Monitor).
_Avoid_: Disabled monitor, paused monitor

**Hidden Monitor**:
A monitor excluded from all status pages while remaining fully checked and alerted. Independent of ACTIVE/INACTIVE.
_Avoid_: Invisible monitor, private monitor

**Group Monitor**:
A monitor whose status is derived from other monitors via a weighted score (UP=1, DEGRADED=0.5, DOWN=0; maintenance counts as UP). A group cannot contain another group.
_Avoid_: Monitor group, composite monitor

**Member**:
A monitor belonging to a Group Monitor, carrying a weight and a position in the execution order. Membership is an explicit stored list, never a dynamic rule (e.g. tag wildcards).
_Avoid_: Child monitor, sub-monitor

**Weight**:
A member's share of the group score, between 0 and 1. Weights across a group's members must sum to 1. Any membership change (add or remove) redistributes all weights equally; manual tuning happens after membership is settled.

**Execution Order**:
The stored order in which a Group Monitor's members are checked before aggregation. Manually arranged, not derived.

**Eligible Monitor**:
A monitor that may become a Member: ACTIVE, not a Group Monitor, and not the group being edited itself.

**Monitoring Sample**:
One recorded data point for a monitor at a timestamp: a status, a latency, and a sample type describing how it was produced. Every sample is either Observed or Synthetic.
_Avoid_: Data point, record, check result

**Observed Sample**:
A Monitoring Sample produced by a check that actually ran against the target, whatever the outcome: a clean evaluation (`REALTIME`), a timed-out check (`TIMEOUT`), or a check that errored (`ERROR`). A check failing to reach the target is itself an observation — for most monitor types that is exactly what "down" looks like.

**Synthetic Sample**:
A Monitoring Sample written by the system or an admin rather than by a check: a raw heartbeat receipt (`SIGNAL`), a status pushed through the data API (`MANUAL`), a default-status fill (`DEFAULT_STATUS`), or an incident/maintenance overlay (`INCIDENT`, `MAINTENANCE`).

**Stale Member**:
A Member whose monitor is no longer an Eligible Monitor (paused or deleted after being added). It remains a Member until explicitly removed, but is excluded from the group score.

### Alerting

**Alert Configuration**:
A per-monitor alerting rule: a condition (status, latency, or uptime against a value), a Failure Threshold, a Success Threshold, whether triggering creates an incident, and the Triggers to notify.
_Avoid_: Alert rule, alarm

**Alert**:
A fired instance of an Alert Configuration for a monitor. TRIGGERED when the condition holds, RESOLVED when the resolve condition later holds. May own the incident it created.
_Avoid_: Alarm, notification (that's what Triggers send)

**Trigger**:
A notification channel (email, webhook, Discord, Slack) that Alert Configurations notify on trigger and on resolve.
_Avoid_: Notifier, channel

**Alert-Visible Sample**:
A Monitoring Sample that alert evaluation can see: every Observed Sample, plus data-API pushes (`MANUAL`) and default-status fill (`DEFAULT_STATUS`). Raw heartbeat receipts (`SIGNAL`) and incident/maintenance overlays are never alert-visible — while an overlay is active the alert window freezes (alerts neither trigger nor resolve). All alert conditions (status and latency alike) evaluate the same alert-visible timeline.

**Failure Threshold**:
The number of consecutive Alert-Visible Samples matching the condition required to trigger an Alert.

**Success Threshold**:
The number of consecutive Alert-Visible Samples meeting the resolve condition required to resolve an Alert.

### Pages

**Page**:
A public status page with its own path, title, monitors, and display settings. Served at `/<page_path>`.

**Home Page**:
The Page served at the site root. Its stored path is empty, it always exists (it can not be deleted), and its path can not be changed. Addressed in the API by the `~home` token.
_Avoid_: Default page, base page, root page

**Status History Window**:
The number of days of per-day status shown for a monitor, per device class (desktop/mobile). Configurable at two levels with the same defaults and bounds: per Page (applies to all its monitors) and per Monitor (overrides the page level).
_Avoid_: History days, bar count

**Page Settings**:
A Page's display configuration: status-history window per device class, monitor layout style, per-page meta/social overrides, and event display preferences. The admin UI and the API expose the same settings, though each surface may name fields differently; a writer must never drop fields it does not understand.
_Avoid_: Display settings (ambiguous with site-wide event display settings)

### Maintenance

**Maintenance**:
A recurring maintenance definition: title, description, an RRULE schedule, a duration, and affected monitors. Identified by its own id.
_Avoid_: Maintenance window, maintenance event (that's an occurrence, see below)

**Maintenance Event**:
A single occurrence of a Maintenance, generated from its RRULE: a concrete start/end time with a lifecycle status (SCHEDULED → READY → ONGOING → COMPLETED). Has its own id, independent of the Maintenance id. The public maintenance page is keyed by Maintenance Event id.
_Avoid_: Occurrence, maintenance instance
