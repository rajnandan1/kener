# Manual maintenance-event transitions rewrite the record to what actually happened

Issue #722 asked for a way to end a maintenance early instead of deleting it or editing its timer. We added manual transitions on Maintenance Events with one governing principle: **the event record reflects what actually happened, not what was planned.** Manually completing or cancelling an ONGOING event truncates `end_date_time` to the moment of the transition; cancelling a not-yet-started event (SCHEDULED/READY) keeps its planned window, since it never affected monitors. We rejected status-only updates (the record would forever claim a 4-hour window for a 1-hour maintenance, and every reader would have to compensate by also checking status).

Allowed transitions: ONGOING → COMPLETED, and SCHEDULED/READY/ONGOING → CANCELLED. COMPLETED means the work finished; CANCELLED means the occurrence was called off. Both are terminal — no relabeling, no un-cancel. Reverse transitions were rejected because the minute-scheduler's catch-up query would immediately flip a resurrected past-start SCHEDULED event back to ONGOING and fire "in progress" notifications. The escape hatch for a mistaken cancel is editing the Maintenance schedule, which regenerates events.

Consequences that fall out of existing code rather than new code:

- Monitor impact stops immediately on transition — the realtime query filters on `status IN (SCHEDULED, READY, ONGOING)`, so no time rewrite is needed for that.
- For recurring Maintenances, cancelling an occurrence permanently skips it: event generation dedups by `start_date_time` against **all** existing events regardless of status, so the CANCELLED row blocks regeneration. This is intended behavior, not an accident — do not "fix" the dedup to ignore CANCELLED rows.
- Public "upcoming"/"ongoing" lists already filter by status, so cancelled events vanish from them while remaining visible (with a CANCELLED badge) on the event detail and events-by-month history pages.

API shape: the transition rides the existing `PATCH /api/v4/maintenances/{maintenance_id}/events/{event_id}` as a second, mutually exclusive mode — either `start_date_time`+`end_date_time` (window edit, unchanged) or `status` alone (transition). Mixing them is a 400, which avoids deciding who wins when an explicit `end_date_time` contradicts the truncation rule. A dedicated action sub-route was rejected as a break from v4's CRUD style.

Notifications: every transition to a terminal status — natural or manual, COMPLETED or CANCELLED — notifies subscribers under the existing `ended` toggle. A dedicated `cancelled` toggle was rejected: the settings object is stored whole, so existing sites would silently default the new key to off, and the uniform reading of `ended` ("tell me when an event reaches its end state") makes a separate toggle unnecessary.
