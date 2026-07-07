import crypto from "crypto";
import { GenerateToken, CookieConfig } from "./commonController";
import { GetUserByEmail, GetOrCreateSSOUser } from "./userController";

export interface SSOConfig {
  enabled: boolean;
  providerName: string;
  clientId: string;
  clientSecret: string;
  authorizationUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
  scope: string;
  emailField: string;
  nameField: string;
  autoProvision: boolean;
  defaultRole: string;
}

const STATE_COOKIE = "sso_state";
const STATE_MAX_AGE = 10 * 60; // 10 minutes

export function GetSSOConfig(): SSOConfig | null {
  if (process.env.SSO_ENABLED !== "true") return null;

  const clientId = process.env.SSO_CLIENT_ID;
  const clientSecret = process.env.SSO_CLIENT_SECRET;
  const authorizationUrl = process.env.SSO_AUTHORIZATION_URL;
  const tokenUrl = process.env.SSO_TOKEN_URL;
  const userInfoUrl = process.env.SSO_USER_INFO_URL;

  if (!clientId || !clientSecret || !authorizationUrl || !tokenUrl || !userInfoUrl) {
    return null;
  }

  return {
    enabled: true,
    providerName: process.env.SSO_PROVIDER_NAME || "SSO",
    clientId,
    clientSecret,
    authorizationUrl,
    tokenUrl,
    userInfoUrl,
    scope: process.env.SSO_SCOPE || "openid email profile",
    emailField: process.env.SSO_EMAIL_FIELD || "email",
    nameField: process.env.SSO_NAME_FIELD || "name",
    autoProvision: process.env.SSO_AUTO_PROVISION === "true",
    defaultRole: process.env.SSO_DEFAULT_ROLE || "member",
  };
}

export function GetSSOAuthorizationUrl(config: SSOConfig, redirectUri: string): { url: string; state: string } {
  const state = crypto.randomBytes(32).toString("hex");
  const params = new URLSearchParams({
    response_type: "code",
    client_id: config.clientId,
    redirect_uri: redirectUri,
    scope: config.scope,
    state,
  });
  return { url: `${config.authorizationUrl}?${params.toString()}`, state };
}

export function GetSSOStateCookieConfig() {
  let isSecuredDomain = false;
  if (!!process.env.ORIGIN) {
    isSecuredDomain = process.env.ORIGIN.startsWith("https://");
  }
  let cookiePath = !!process.env.KENER_BASE_PATH ? process.env.KENER_BASE_PATH : "/";
  return {
    name: STATE_COOKIE,
    secure: isSecuredDomain,
    maxAge: STATE_MAX_AGE,
    httpOnly: true,
    sameSite: "lax" as const,
    path: cookiePath,
  };
}

interface SSOUserInfo {
  email: string;
  name: string;
}

export async function ExchangeCodeForTokens(
  config: SSOConfig,
  code: string,
  redirectUri: string,
): Promise<{ accessToken: string }> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: config.clientId,
    client_secret: config.clientSecret,
  });

  const response = await fetch(config.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Token exchange failed: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  const accessToken = data.access_token;
  if (!accessToken) {
    throw new Error("No access_token in token response");
  }
  return { accessToken };
}

export async function FetchUserInfo(config: SSOConfig, accessToken: string): Promise<SSOUserInfo> {
  const response = await fetch(config.userInfoUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`User info fetch failed: ${response.status} ${errorText}`);
  }

  const data = await response.json();

  const email = data[config.emailField] || data.email;
  const name = data[config.nameField] || data.name || email?.split("@")[0] || "";

  if (!email) {
    throw new Error("Could not get email from SSO provider");
  }

  return { email: email.toLowerCase().trim(), name: name.trim() };
}

export async function HandleSSOCallback(
  config: SSOConfig,
  code: string,
  redirectUri: string,
): Promise<{ token: string; isNewUser: boolean }> {
  const { accessToken } = await ExchangeCodeForTokens(config, code, redirectUri);
  const ssoUser = await FetchUserInfo(config, accessToken);

  // Look up existing user
  let userDB = await GetUserByEmail(ssoUser.email);

  let isNewUser = false;
  if (!userDB) {
    if (!config.autoProvision) {
      throw new Error("No account found for this SSO email. Contact your administrator.");
    }
    userDB = await GetOrCreateSSOUser(ssoUser.email, ssoUser.name, config.defaultRole);
    isNewUser = true;
  } else if (!userDB.is_active) {
    throw new Error("Your account has been deactivated. Please contact an administrator.");
  }

  if (!userDB.role_ids || userDB.role_ids.length === 0) {
    throw new Error("Your account has no active roles assigned. Please contact an administrator.");
  }

  const token = await GenerateToken(userDB);
  return { token, isNewUser };
}
