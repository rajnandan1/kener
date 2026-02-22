---
title: "Webhook Examples"
description: "Index page for alerting webhook examples now maintained under Guides"
---

Webhook provider examples are now maintained in Guides.

## Moved examples {#moved-examples}

Use:

- [Alerting Trigger Examples Guide](/docs/v4/guides/alerting-trigger-examples)

This guide includes Telegram and other common webhook integrations with runtime-compatible variables and `$ENV_VAR` secret usage.

## Quick reminder {#quick-reminder}

- Use Mustache variables from [Templates](/docs/v4/alerting/templates)
- Use `$VAR_NAME` for secrets in URL/headers/body
- For webhook headers, use `[{"key":"...","value":"..."}]`
