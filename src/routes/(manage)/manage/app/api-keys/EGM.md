# API Keys Page

## Overview

This route serves `/manage/app/api-keys`. It lists, creates, turns on or off, and deletes API keys. An API key is a row in the `api_keys` table that lets a client call the `/api/v4` endpoints. The page has no `load` function. It reads and writes through the manage API: the `POST /manage/api` endpoint, which checks a permission for each action.

## Interface

- The page sends `getAPIKeys` (permission `api_keys.read`) to list the keys with `id`, `name`, `masked_key`, `status`, and `created_at`.
- The create dialog sends `createNewApiKey` (permission `api_keys.write`) with `name`.
- The switch on each row sends `updateApiKeyStatus` (permission `api_keys.write`) with `id` and `status`.
- Delete sends `deleteApiKey` (permission `api_keys.delete`) with `id`.

## Invariants

- The layout guard in `src/routes/(manage)/+layout.server.ts` lets only users with `api_keys.read` open this route.
- Create needs a name that is not empty after trim.
- The full key exists only in the `createNewApiKey` response. The page shows it once, with a notice that it will not show again. Dismiss clears it from memory.
- The list shows only the last 32 characters of `masked_key`.
- `status` is `ACTIVE` or `INACTIVE`.
- The delete button is disabled when `page.data.userPermissions` does not include `api_keys.delete`. Delete also needs a confirmation in an alert dialog.

## Side Effects

- The actions create, update, and delete `api_keys` rows.
- The copy button writes the full new key to the clipboard with `navigator.clipboard.writeText`.

## Verification

- Run: `npm run check` (svelte-kit sync and the svelte-check type check).
- Run: `npm test` (the full suite). No test covers this directory directly.
