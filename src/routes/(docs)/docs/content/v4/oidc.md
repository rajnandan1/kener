---
title: OpenID Connect (OIDC)
description: Configure single sign-on with an external identity provider
---

Use **Manage → OpenID Connect** to let users sign in via an external identity provider (Keycloak, Authentik, Azure AD, Okta, etc.) instead of — or in addition to — local username/password.

## How it works {#how-it-works}

Kener implements the standard OpenID Connect Authorization Code Flow with PKCE:

1. User clicks **Sign in with {provider}** on the login page.
2. Kener redirects to the identity provider's authorization endpoint.
3. User authenticates at the provider.
4. Provider redirects back to Kener with an authorization code.
5. Kener exchanges the code for tokens and reads the user's identity and group memberships.
6. A Kener session is created and roles are assigned based on group mappings.

OIDC users and local users are kept completely separate — there is no account merging. If a local account with the same email already exists, the OIDC login will be rejected with an error message.

## Setup {#setup}

### 1. Create a client in your identity provider {#create-client}

Create an OIDC client (also called an "application" in some providers) with these settings:

| Setting | Value |
| --- | --- |
| Client protocol | OpenID Connect |
| Access type | Confidential |
| Redirect URI | `https://your-kener-domain/account/oidc/callback` |
| Web origins | `https://your-kener-domain` |

Copy the **Client ID** and **Client Secret** from your provider.

### 2. Enable the groups claim {#enable-groups-claim}

Most providers don't include group memberships in the ID token by default. You need to configure a mapper/scope:

**Keycloak:**
1. Go to your client → Client Scopes → Dedicated scope
2. Add Mapper → Group Membership
3. Token Claim Name: `groups`
4. Full group path: OFF
5. Add to ID token: ON

**Authentik:**
1. Go to your provider → Advanced protocol settings
2. Add scope: `groups`

**Azure AD:**
1. App registration → Token configuration
2. Add groups claim → Security groups

The claim name varies by provider. Common values: `groups` (Keycloak, Authentik), `roles`, `cognito:groups` (AWS Cognito).

### 3. Configure Kener {#configure-kener}

Go to **Manage → OpenID Connect** and fill in:

| Setting | Description |
| --- | --- |
| Enable OpenID Connect | Turn on OIDC authentication |
| Provider Name | Displayed on the login button (e.g. "Keycloak") |
| Issuer URL | Your provider's issuer URL (must support `.well-known/openid-configuration`) |
| Client ID | From step 1 |
| Client Secret | From step 1 |
| Scopes | Space-separated list (default: `openid profile email`) |
| Groups Claim Name | The claim in the ID token that contains group memberships (default: `groups`) |

Click **Test Connection** to verify Kener can reach the provider's discovery endpoint.

Click **Save Settings**.

### 4. Set up group-to-role mappings {#group-role-mapping}

In the **Group → Role Mapping** section, map OIDC group names to Kener roles:

| OIDC Group | Kener Role |
| --- | --- |
| `Windows-Admins` | `admin` |
| `Monitoring-Viewers` | `member` |

When a user signs in via OIDC, Kener reads their group memberships from the ID token and assigns the corresponding roles. Roles are synchronized on every login — if a user is removed from a group in the identity provider, they lose the corresponding Kener role on next sign-in.

Roles assigned manually (not through any OIDC mapping) are preserved and not affected by the sync.

If none of a user's groups match any mapping, the configured **Default Role** is assigned.

## Settings reference {#settings-reference}

| Setting | Default | Description |
| --- | --- | --- |
| Allow local login | ON | When OFF, the password form is hidden and only the OIDC button is shown |
| Auto-create users on first login | OFF | When ON, new Kener users are created automatically on first OIDC login |
| Default Role | `member` | Fallback role when no group mapping matches |

## Lockout recovery {#lockout-recovery}

If local login is disabled and the identity provider becomes unreachable, no one can sign in. To recover, set the environment variable:

```
KENER_FORCE_LOCAL_LOGIN=true
```

This re-enables the local login form regardless of the OIDC setting. Remove the variable after the provider is back.

## Limitations {#limitations}

- **No RP-Initiated Logout**: Signing out of Kener does not end the session at the identity provider. The user remains authenticated at the provider until the session expires there.
- **HTTPS required**: The `openid-client` library enforces HTTPS for the issuer URL. HTTP issuers (e.g. local development without TLS) will fail with a discovery error.
- **No account merging**: OIDC users and local users are separate. A user cannot sign in via both methods with the same account.

## Related pages {#related-pages}

- [User Management](/docs/v4/user-management)
- [Environment Variables](/docs/v4/setup/environment-variables)