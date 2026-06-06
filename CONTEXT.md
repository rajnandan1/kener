# Kener

An open-source status page application providing real-time monitoring, uptime tracking, incident management, and customizable dashboards.

## Language

### Monitoring

**Monitor**:
A single check against a service, with a unique tag, a type (API, Ping, TCP, DNS, SSL, SQL, Heartbeat, GameDig, Group, gRPC, None), and a status (ACTIVE or otherwise).
_Avoid_: Check, probe, service

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

**Stale Member**:
A Member whose monitor is no longer an Eligible Monitor (paused or deleted after being added). It remains a Member until explicitly removed, but is excluded from the group score.
