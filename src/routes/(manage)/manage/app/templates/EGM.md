# Email Templates Page

## Overview

This route serves `/manage/app/templates`. It edits the general email templates in the `general_email_templates` table. These are the emails that Kener itself sends. `seeds/generate_template.ts` creates them from `src/lib/server/templates/general/`: the subscription account code, the subscription update, forgot password, the user invitation, and email verification. Alert emails use trigger templates instead. The page has no `load` function. It reads and writes through the manage API: the `POST /manage/api` endpoint, which checks a permission for each action.

## Interface

- The page sends `getGeneralEmailTemplates` (permission `email_templates.read`) to list the templates. It selects the first template.
- Each template has `template_id`, `template_subject`, `template_html_body`, and `template_text_body`.
- Save sends `updateGeneralEmailTemplate` (permission `email_templates.write`) with `templateId`, `template_subject`, `template_html_body`, and `template_text_body`. The handler reads the key `templateId`, not `template_id`.

## Invariants

- The layout guard in `src/routes/(manage)/+layout.server.ts` lets only users with `email_templates.read` open this route.
- Save needs a selected template.
- The page cannot create or delete a template. It edits only the templates that exist.
- After a save, the page updates its in-memory copy of the template.

## Side Effects

- `updateGeneralEmailTemplate` writes one `general_email_templates` row.

## Verification

- Run: `npm run check` (svelte-kit sync and the svelte-check type check).
- Run: `npm test` (the full suite). No test covers this directory directly.
