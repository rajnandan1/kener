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

OIDC accounts and local accounts are kept separate — there is no account merging. Accounts are matched by the provider's `sub` claim, never by email.

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

| Setting               | Env variable                   | Description                                                             |
| --------------------- | ------------------------------ | ----------------------------------------------------------------------- |
| Enable OpenID Connect | `KENER_OIDC_ENABLED`           | `true` / `false`                                                        |
| Provider Name         | `KENER_OIDC_PROVIDER_NAME`     | Shown on the login button                                               |
| Issuer URL            | `KENER_OIDC_ISSUER_URL`        | Must serve `/.well-known/openid-configuration`; `https` required        |
| Client ID             | `KENER_OIDC_CLIENT_ID`         | From step 1                                                             |
| Client Secret         | `KENER_OIDC_CLIENT_SECRET`     | From step 1; never shown again in the UI                                |
| Scopes                | `KENER_OIDC_SCOPES`            | Space-separated, must include `openid` (default `openid profile email`) |
| Groups Claim Name     | `KENER_OIDC_GROUPS_CLAIM`      | Claim holding the group list (default `groups`)                         |
| Allow local login     | `KENER_OIDC_ALLOW_LOCAL_LOGIN` | `true` / `false` (default `true`)                                       |
| Auto-create users     | `KENER_OIDC_AUTO_CREATE_USERS` | `true` / `false` (default `false`)                                      |
| Default Role          | `KENER_OIDC_DEFAULT_ROLE_ID`   | Role id used when no mapping matches (default `member`)                 |

**Precedence:** an environment variable that is set (non-empty) wins over the value saved in the UI for that field only. Env-configured fields are shown read-only with a _Set by environment_ badge and are never written to the database. `KENER_OIDC_ALLOW_HTTP=true` permits an `http:` issuer for local development only.

### 4. Map groups to roles {#group-role-mapping}

In **Group → Role Mapping**, map provider group names to Kener roles, e.g. `platform-admins → admin`, `viewers → member`.

On every login Kener recomputes the user's _managed_ roles — every role that appears in a mapping, plus the default role — from their current groups. Roles that are not part of any mapping (assigned manually) are preserved. If no group matches, the **Default Role** is assigned. The owner account always keeps `admin`.

## Local login, lockout and break-glass {#lockout-recovery}

When **Allow local login** is off, only the SSO button is offered. Two escape hatches always remain:

- The **owner** account (the first user) can always sign in with its password — the login page shows a small _Sign in with password (owner)_ link.
- Set `KENER_OIDC_ALLOW_LOCAL_LOGIN=true` in the environment to re-enable password login for everyone (for example while the provider is down).

## Account rules {#account-rules}

- OIDC accounts are created verified and active, with an empty password. They cannot request a password reset, and administrators cannot set a password for them.
- On first login (with auto-create on) the provider's email must not already belong to another Kener account; otherwise the sign-in is refused (the user sees "not provisioned"; the reason is in the server log). Create the user via the provider or delete the conflicting local account.
- Name and email are refreshed from the provider on every login. If the new email already belongs to another account, the old email is kept and a warning is logged. Because sessions are keyed by email, an email change ends the user's other sessions.
- Sign-in errors are shown as fixed messages; details (provider `error_description`, exchange failures) are only written to the server log.

## Limitations {#limitations}

- No RP-Initiated Logout: signing out of Kener does not end the session at the provider.
- One provider per Kener installation.
- HTTPS is required for the issuer outside local development.

## Related pages {#related-pages}

- [User Management](/docs/v4/user-management)
- [Environment Variables](/docs/v4/setup/environment-variables)
