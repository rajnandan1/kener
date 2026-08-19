---
title: OpenID Connect (OIDC)
description: Configure single sign-on with an external identity provider
---

Use **Manage → OpenID Connect** (or `KENER_OIDC_*` environment variables) to let users sign in via an external identity provider (Keycloak, Authentik, GitLab, Azure AD, Okta, …) instead of — or in addition to — local email/password.

## How it works {#how-it-works}

Kener implements the OpenID Connect Authorization Code Flow with PKCE:

1. The user clicks **Sign in with {provider}** on the login page.
2. Kener redirects to the provider's authorization endpoint (with `state`, `nonce` and a PKCE challenge).
3. The user authenticates at the provider.
4. The provider redirects back to `/account/oidc/callback` with an authorization code.
5. Kener exchanges the code for tokens, verifies them, and reads the user's identity and group memberships.
6. A Kener session is created and roles are assigned from the group→role mappings.

OIDC accounts and local accounts are kept separate — there is no account merging. Accounts are matched by the provider's issuer **and** `sub` claim together, never by email — a `sub` is only unique within one provider. Consequently, pointing Kener at a different issuer (a new identity provider, or the same one under a new URL) means no existing OIDC account matches any more: users are treated as new identities on their next sign-in (and refused as "not provisioned" while their email is still taken by the old account).

## Setup {#setup}

### 1. Create a client at your identity provider {#create-client}

| Setting         | Value                                                                                                                       |
| --------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Client protocol | OpenID Connect                                                                                                              |
| Access type     | Confidential                                                                                                                |
| Redirect URI    | `https://<your-kener-host>[/<base-path>]/account/oidc/callback` — copy the exact value shown on **Manage → OpenID Connect** |
| Web origins     | `https://<your-kener-host>`                                                                                                 |

Copy the **Client ID** and **Client Secret**.

### 2. Expose the groups claim {#enable-groups-claim}

Most providers do not include group memberships in the ID token by default:

- **Keycloak**: client → Client Scopes → dedicated scope → Add mapper → _Group Membership_; claim name `groups`, _Full group path_ off, _Add to ID token_ on.
- **Authentik**: provider → Advanced protocol settings → add the `groups` scope.
- **GitLab**: add the `groups` scope in Kener's _Scopes_; GitLab returns the `groups_direct` claim — set _Groups Claim Name_ to `groups_direct`.
- **Azure AD**: App registration → Token configuration → Add groups claim.

### 3. Configure Kener {#configure-kener}

Either fill in **Manage → OpenID Connect** and click **Test Connection**, then **Save**, or set the environment variables below.

| Setting               | Env variable                   | Description                                                                                                                                                                                                                                                                  |
| --------------------- | ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Enable OpenID Connect | `KENER_OIDC_ENABLED`           | `true` / `false`                                                                                                                                                                                                                                                             |
| Provider Name         | `KENER_OIDC_PROVIDER_NAME`     | Shown on the login button                                                                                                                                                                                                                                                    |
| Issuer URL            | `KENER_OIDC_ISSUER_URL`        | Must serve `/.well-known/openid-configuration`; `https` required                                                                                                                                                                                                             |
| Client ID             | `KENER_OIDC_CLIENT_ID`         | From step 1                                                                                                                                                                                                                                                                  |
| Client Secret         | `KENER_OIDC_CLIENT_SECRET`     | From step 1; never shown again in the UI                                                                                                                                                                                                                                     |
| Scopes                | `KENER_OIDC_SCOPES`            | Space-separated, must include `openid` (default `openid profile email`)                                                                                                                                                                                                      |
| Groups Claim Name     | `KENER_OIDC_GROUPS_CLAIM`      | Claim holding the group list (default `groups`)                                                                                                                                                                                                                              |
| Allow local login     | `KENER_OIDC_ALLOW_LOCAL_LOGIN` | `true` / `false` (default `true`)                                                                                                                                                                                                                                            |
| Auto-create users     | `KENER_OIDC_AUTO_CREATE_USERS` | `true` / `false` (default `false`). Must be `true` for a user's **first** sign-in — that is when the account is created and linked to the provider's `sub`. Turning it off afterwards freezes the set of linked accounts: new identities are refused with "not provisioned". |
| Default Role          | `KENER_OIDC_DEFAULT_ROLE_ID`   | Role id used when no mapping matches (default `member`). Choose _No default role_ in the UI, or set the variable to `none`, to refuse users without a matching group instead.                                                                                                |

**Precedence:** an environment variable that is set (non-empty) wins over the value saved in the UI for that field only. Env-configured fields are shown read-only with a _Set by environment_ badge and are never written to the database. `KENER_OIDC_ALLOW_HTTP=true` permits an `http:` issuer for local development only. Group→role mappings can also come from the environment via `KENER_OIDC_GROUP_ROLE_MAP` — see [below](#group-role-mapping-env).

### 4. Map groups to roles {#group-role-mapping}

In **Group → Role Mapping**, map provider group names to Kener roles, e.g. `platform-admins → admin`, `viewers → member`. Each group maps to exactly one role; a user in several mapped groups gets all of those roles. Group names are matched exactly and case-sensitively against the values of the groups claim.

On every login Kener recomputes the user's _managed_ roles — every role that appears in a mapping, plus the default role — from their current groups. Roles that are not part of any mapping (assigned manually) are preserved. If no group matches, the **Default Role** is assigned. The owner account always keeps `admin`.

**No mapped role → refuse.** There is no built-in fallback role. If no group matches and no active default role is configured (the UI option _No default role_, `KENER_OIDC_DEFAULT_ROLE_ID=none`, or a default role that has been deactivated), a first sign-in is refused as _not provisioned_ and an existing user who is left without any active role is denied as _no roles_ — the empty role set is still written, so the account shows up without roles under **Users**. Mapped roles alone are always sufficient.

#### Managing mappings from the environment {#group-role-mapping-env}

Set `KENER_OIDC_GROUP_ROLE_MAP` to a JSON object of `"<group>": "<role id>"` to manage the mappings from the deployment instead of the UI:

```shell
KENER_OIDC_GROUP_ROLE_MAP='{"3connect/infra":"admin","3connect/devs":"editor"}'
```

- **Full replacement, never a merge.** While the variable is set and parseable, the mappings saved in the database are ignored entirely, and the **Group → Role Mapping** card becomes read-only (_Set by environment_; Add and Delete are refused). Unset it and the database mappings apply again unchanged.
- **Role ids** are the ids shown in **Manage → Roles** (for example `admin`, `editor`, `member`). Roles named in the map are OIDC-managed exactly like database mappings, so leaving a group revokes the role on the next login.
- **Invalid configuration degrades, it never crashes the process** — a bad value at boot would otherwise lock you out of the status page. Problems are logged once and listed on the admin page:

    | Value                                               | Behaviour                                                |
    | --------------------------------------------------- | -------------------------------------------------------- |
    | Empty / whitespace                                  | Treated as unset                                         |
    | Not a JSON object (invalid JSON, array, string, …)  | Whole variable ignored, database mappings stay in effect |
    | Entry whose role id does not exist or is not active | That entry is dropped, the rest apply                    |
    | Entry with an empty group or role id                | That entry is dropped, the rest apply                    |

- **Switching an existing instance from database mappings to the environment:** roles that users received from database mappings which are absent from the env map are no longer managed, so they stick to those users as if assigned manually. Either carry every mapping over, or remove the stale roles from the affected users once.

## Local login, lockout and break-glass {#lockout-recovery}

When **Allow local login** is off, only the SSO button is offered. Two escape hatches always remain:

- The **owner** account (the first user) can always sign in with its password — the login page shows a small _Sign in with password (owner)_ link.
- Set `KENER_OIDC_ALLOW_LOCAL_LOGIN=true` in the environment to re-enable password login for everyone (for example while the provider is down).

## Account rules {#account-rules}

- OIDC accounts are created verified and active, with an empty password. They cannot request a password reset, and administrators cannot set a password for them.
- **Auto-create must be on for a user's first sign-in** — that is the moment the account is created and linked to the provider's `sub` claim. Turning auto-create off afterwards does not affect users who already signed in once, but it freezes the set of linked accounts: there is no manual "link this local user to an OIDC identity" in this version, so a new identity can only be provisioned while auto-create is on.
- A **first** sign-in is refused with "not provisioned" in three cases: auto-create is off; the provider's email already belongs to another Kener account; or no group mapping matched and no active default role is configured. (None of these affect users who already signed in once.) Either way the specific reason is only in the server log — create the user via the provider, turn on auto-create, delete/rename the conflicting local account, or add a mapping / default role.
- An existing OIDC user whose last active role was revoked by the group sync (and who has no manual roles) is denied with "no roles"; assign a role manually or fix the mapping.
- **Logout** ends the Kener session only; the identity provider's single-sign-on session stays alive (as with any SSO application). So that "log out" still means something on a shared machine, the next _Sign in with …_ in that browser asks the provider for credentials again (`prompt=login`) instead of silently signing the same user back in. To end the provider session itself, sign out at the provider.
- Name and email are refreshed from the provider on every login. If the new email already belongs to another account, the old email is kept and a warning is logged. Because sessions are keyed by email, an email change ends the user's other sessions.
- Sign-in errors are shown as fixed messages; details (provider `error_description`, exchange failures) are only written to the server log.

## Limitations {#limitations}

- No RP-Initiated Logout: signing out of Kener does not end the session at the provider.
- One provider per Kener installation.
- HTTPS is required for the issuer outside local development.
- No manual account linking — a user must sign in once while auto-create is enabled.
- Kener trusts the provider's `email` claim as-is; the `email_verified` claim is not enforced — only allow identity providers whose email addresses are verified.

## Related pages {#related-pages}

- [User Management](/docs/v4/user-management)
- [Environment Variables](/docs/v4/setup/environment-variables)
