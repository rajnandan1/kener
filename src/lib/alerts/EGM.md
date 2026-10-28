# alerts

## Overview

This folder holds the text helper for monitor alert settings in the admin area. The alert pages under `/manage/app/alerts` call it to build field labels, help text, and a one-sentence summary of an alert rule.

## Interface

- `getAlertText({ kind, alert_for, alert_value?, failure_threshold?, success_threshold? })` (`alert-text.ts`) returns a string:
    - `kind: "label"` returns the label of the value field, for example `Latency Threshold (ms)`.
    - `kind: "help"` returns the help text of the value field.
    - `kind: "description"` returns one sentence that describes the rule, for example `Alert when latency exceeds 500ms for 3 consecutive checks. Resolve after 2 check(s) below threshold.`
- Two files import it: `src/routes/(manage)/manage/app/alerts/+page.svelte` and `src/routes/(manage)/manage/app/alerts/[alert_config_id]/+page.svelte`.

## Invariants

- `alert_for` must be `GC.STATUS`, `GC.LATENCY`, or `GC.UPTIME` from `src/lib/global-constants.ts` (the strings `STATUS`, `LATENCY`, and `UPTIME`). Any other value gets the label `Value`, an empty help text, and an empty description.
- A latency value is in milliseconds. An uptime value is in percent.
- A missing `failure_threshold` or `success_threshold` shows as `0`. A missing `alert_value` shows as an empty string.
- The texts are English literals. They do not go through the `$t` translation store.

## Side Effects

- None. `getAlertText` is a pure function.

## Verification

- Run `npm run check` (svelte-kit sync and the svelte-check type check).
- Run `npm test` (the full suite). No test covers this folder directly.
