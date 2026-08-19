export interface SiteAnnouncement {
  title: string;
  message: string;
  type: "INFO" | "WARNING" | "ERROR";
  reshowAfterInHours: number | null;
  cancellable: boolean;
  ctaURL: string | null;
  ctaText: string | null;
}

export interface SiteMetaTag {
  key: string;
  value: string;
}

export interface SiteNavItem {
  name: string;
  url: string;
  iconURL: string;
}

export interface SiteHero {
  title: string;
  subtitle: string | null;
  image: string | null;
}

export interface SiteI18nLocale {
  code: string;
  name: string;
  selected: boolean;
  disabled: boolean;
}

export interface SiteI18nConfig {
  defaultLocale: string;
  locales: SiteI18nLocale[];
}

export interface SiteAnalyticsItem {
  id: string;
  type: string;
  name: string;
  script: string;
}

export interface SiteStatusColors {
  UP: string;
  DOWN: string;
  DEGRADED: string;
  MAINTENANCE: string;
  ACCENT: string;
  ACCENT_FOREGROUND: string;
}

export interface SiteFont {
  cssSrc: string;
  family: string;
}

export interface SiteCategory {
  name: string;
  description: string;
  isHidden: boolean;
  image: string | null;
}

export interface SiteHomeDataMaxDays {
  desktop: {
    maxDays: number;
    selectableDays: number[];
  };
  mobile: {
    maxDays: number;
    selectableDays: number[];
  };
}

export interface SiteSubscriptionsSettings {
  enable: boolean;
  methods: {
    emails: {
      incidents: boolean;
      maintenance: boolean;
    };
  };
}

export interface SiteSubMenuOptions {
  showShareBadgeMonitor: boolean;
  showShareEmbedMonitor: boolean;
  showRssFeed: boolean;
}

export interface DataRetentionPolicy {
  enabled: boolean;
  retentionDays: number;
}

export interface EventDisplaySettings {
  showInlineEvents: boolean;
  incidents: {
    enabled: boolean;
    ongoing: {
      show: boolean;
    };
    resolved: {
      show: boolean;
      maxCount: number;
      daysInPast: number;
    };
  };
  maintenances: {
    enabled: boolean;
    ongoing: {
      show: boolean;
    };
    past: {
      show: boolean;
      maxCount: number;
      daysInPast: number;
    };
    upcoming: {
      show: boolean;
      maxCount: number;
      daysInFuture: number;
    };
  };
}

export interface GlobalPageVisibilitySettings {
  showSwitcher: boolean;
  forceExclusivity: boolean;
}

export interface PageOrderingSettings {
  enabled: boolean;
  order: number[]; // Array of page IDs in the desired order
}

export interface SiteDateTimeFormat {
  datePlusTime: string;
  dateOnly: string;
  timeOnly: string;
}

export interface SitemapXMLConfig {
  mode: "auto" | "manual" | "off";
  urls: {
    loc: string;
  }[];
}

export interface GlobalMaintenanceNotificationSettings {
  event_types: {
    created: boolean;
    reminder: boolean;
    started: boolean;
    ended: boolean;
  };
  reminder_buffer_hours: number;
}

export interface OidcSettings {
  enabled: boolean;
  provider_name: string;
  issuer_url: string;
  client_id: string;
  client_secret: string;
  scopes: string;
  groups_claim: string;
  allow_local_login: boolean;
  auto_create_users: boolean;
  default_role_id: string;
}

/**
 * Value type of every OidcSettings field — the single source of truth for the
 * structural validator and the env-override parser. `satisfies` makes a field
 * added to (or misspelled in) OidcSettings a compile error here instead of a
 * runtime "Invalid OIDC settings" on every save.
 */
export const OIDC_SETTINGS_FIELD_TYPES = {
  enabled: "boolean",
  provider_name: "string",
  issuer_url: "string",
  client_id: "string",
  client_secret: "string",
  scopes: "string",
  groups_claim: "string",
  allow_local_login: "boolean",
  auto_create_users: "boolean",
  default_role_id: "string",
} as const satisfies Record<keyof OidcSettings, "string" | "boolean">;

/** OidcSettings as returned to the admin UI: secret masked, plus whether one is stored. */
export type OidcSettingsMasked = Omit<OidcSettings, "client_secret"> & {
  client_secret: string;
  has_client_secret: boolean;
};

/** What the public sign-in page needs to know. Never includes credentials. */
export interface OidcPublicState {
  enabled: boolean;
  providerName: string;
  allowLocalLogin: boolean;
}

/**
 * Identity extracted from the ID token / userinfo. An account is keyed by
 * `(issuer, sub)`: a subject is only unique within one provider, so a new
 * issuer handing out a known `sub` must never resolve to the old account.
 */
export interface OidcIdentity {
  /** The discovered issuer identifier (openid-client validates the ID token's `iss` against it). */
  issuer: string;
  sub: string;
  email: string;
  name: string;
  groups: string[];
}

/** One group→role mapping; `id` is present only for rows that live in the database. */
export interface OidcGroupRoleMappingEntry {
  id?: number;
  oidc_group: string;
  role_id: string;
}

/** An entry of KENER_OIDC_GROUP_ROLE_MAP that was ignored, and why. */
export interface OidcGroupRoleMappingInvalidEntry {
  oidc_group: string;
  role_id: string;
  reason: string;
}

/**
 * The mappings in effect, as shown in the admin UI. `source: "env"` means
 * KENER_OIDC_GROUP_ROLE_MAP is set and parseable and the database table is
 * ignored; `error` is set when the variable is set but unparseable (database
 * mappings are then in effect).
 */
export interface OidcGroupRoleMappingsView {
  source: "env" | "db";
  mappings: OidcGroupRoleMappingEntry[];
  invalid: OidcGroupRoleMappingInvalidEntry[];
  error?: string;
}

/** Error codes surfaced to the sign-in page via `?oidc_error=<code>`. Details stay in server logs. */
export const OIDC_ERROR_CODES = [
  "provider_error",
  "session_expired",
  "auth_failed",
  "not_provisioned",
  "deactivated",
  "no_roles",
] as const;
export type OidcErrorCode = (typeof OIDC_ERROR_CODES)[number];
