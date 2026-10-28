# OpenID Connect Page

## Overview

This route serves `/manage/app/oidc`. It configures sign-in through OpenID Connect (OIDC), a standard for single sign-on with an outside identity provider. It also maps OIDC groups to Kener roles. The page has no `load` function. It reads and writes through the manage API: the `POST /manage/api` endpoint, which checks a permission for each action.

## Interface

- The page sends `getOidcSettingsMasked` (permission `settings.read`) to load the `oidcSettings` site data key with the client secret masked.
- Save sends `storeSiteData` (permission `settings.write`) with `oidcSettings` as a JSON string.
- "Test connection" sends `testOidcConnection` (permission `settings.write`) with the unsaved `settings`. It shows the issuer and the endpoints that come back.
- The mapping card sends `getRoles` (permission `roles.read`) and `getOidcGroupRoleMappings` (permission `settings.read`).
- "Add mapping" sends `upsertOidcGroupRoleMapping` (permission `settings.write`) with `oidc_group` and `role_id`. Delete sends `deleteOidcGroupRoleMapping` (permission `settings.write`) with `id`.
- The settings fields are `enabled`, `provider_name`, `issuer_url`, `client_id`, `client_secret`, `scopes`, `groups_claim`, `allow_local_login`, `auto_create_users`, and `default_role_id`.

## Invariants

- The layout guard in `src/routes/(manage)/+layout.server.ts` lets only users with `settings.read` open this route.
- The defaults are `scopes` `openid profile email`, `groups_claim` `groups`, `allow_local_login` `true`, `auto_create_users` `false`, and `default_role_id` `member`.
- On save, the page removes `client_secret` from the request when it still equals the masked value. The server then keeps the stored secret.
- The test button is disabled when `issuer_url` or `client_id` is empty.
- A new mapping needs a group name and a role. The role picker offers only `ACTIVE` roles.
- The mapping card shows only when `enabled` is `true`. A mapping delete needs a confirmation.

## Side Effects

- `storeSiteData` writes `oidcSettings` to `site_data`, and the server clears its cached OIDC configuration.
- The mapping actions write `oidc_group_role_mappings`.
- `testOidcConnection` makes the server fetch the provider's discovery document. It does not change the cached configuration.
- The page shows the callback URL `{origin}/account/oidc/callback`.

## Verification

- Run: `npm run check` (svelte-kit sync and the svelte-check type check).
- Run: `npm test` (the full suite). No test covers this directory directly.
