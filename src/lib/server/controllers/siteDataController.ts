import db from "../db/db.js";
import { IsMaskedString, MaskString } from "../tool.js";
import {
  LabelsFor,
  MaskOmittedSecrets,
  MaskStoredSecrets,
  RestoreStoredSecrets,
  SITE_DATA_LABELS,
} from "../storedSecrets.js";
import { siteDataKeys } from "./siteDataKeys.js";
import { ClearOidcConfigCache } from "./oidcController.js";
import type { Cookies } from "@sveltejs/kit";
import type {
  DataRetentionPolicy,
  EventDisplaySettings,
  GlobalPageVisibilitySettings,
  PageOrderingSettings,
  SiteAnalyticsItem,
  SiteAnnouncement,
  SiteCategory,
  SiteFont,
  SiteHero,
  SiteHomeDataMaxDays,
  SiteI18nConfig,
  SiteMetaTag,
  SiteNavItem,
  SiteStatusColors,
  SiteSubMenuOptions,
  SiteDateTimeFormat,
  SiteSubscriptionsSettings,
  SitemapXMLConfig,
  GlobalMaintenanceNotificationSettings,
} from "../../types/site.js";

export interface SiteDataTransformed {
  title?: string;
  siteName?: string;
  siteURL: string;
  home?: string;
  logo?: string;
  favicon?: string;
  metaTags?: SiteMetaTag[];
  nav?: SiteNavItem[];
  hero?: SiteHero;
  footerHTML?: string;
  i18n: SiteI18nConfig;
  pattern?: string;
  analytics?: SiteAnalyticsItem[];
  theme?: string;
  themeToggle?: string;
  tzToggle?: string;
  barStyle: string;
  barRoundness?: string;
  summaryStyle?: string;
  colors: SiteStatusColors;
  colorsDark: SiteStatusColors;
  font: SiteFont;
  categories?: SiteCategory[];
  homeIncidentCount?: number | null;
  homeIncidentStartTimeWithin?: number;
  homeDataMaxDays?: SiteHomeDataMaxDays;
  kenerTheme?: string;
  subscriptionsSettings?: SiteSubscriptionsSettings;
  showSiteStatus?: string;
  monitorSort?: number[];

  subMenuOptions?: SiteSubMenuOptions;
  announcement?: SiteAnnouncement;
  dataRetentionPolicy?: DataRetentionPolicy;
  eventDisplaySettings?: EventDisplaySettings;
  socialPreviewImage?: string;
  customCSS?: string;
  globalPageVisibilitySettings?: GlobalPageVisibilitySettings;
  pageOrderingSettings?: PageOrderingSettings;
  dateAndTimeFormat?: SiteDateTimeFormat;
  metaSiteTitle?: string;
  metaSiteDescription?: string;
  sitemap?: SitemapXMLConfig;
  globalMaintenanceNotificationSettings?: GlobalMaintenanceNotificationSettings;
}

const siteDataLabels = (key: string) => LabelsFor(SITE_DATA_LABELS, key);

/** Returns a copy of a site-data value with its secrets masked, for any response that leaves the server. */
export function MaskSiteDataSecret(key: string, value: unknown): unknown {
  return MaskStoredSecrets(value, siteDataLabels(key), MaskString);
}

/**
 * Puts the stored secret back when a save sends any masked secret or leaves it out. An empty string clears it.
 * Throws StoredSecretError when the value's destination changed, for example the OIDC issuer_url.
 */
export function RestoreSiteDataSecret(key: string, value: unknown, stored: unknown): unknown {
  const labels = siteDataLabels(key);
  if (labels === "plain" || !value || typeof value !== "object" || Array.isArray(value)) return value;
  const sent = labels ? MaskOmittedSecrets(value as Record<string, unknown>, stored, labels) : value;
  return RestoreStoredSecrets(sent, stored, labels, labels, IsMaskedString);
}

export async function InsertKeyValue(key: string, value: string): Promise<number[]> {
  let f = siteDataKeys.find((k) => k.key === key);
  if (!f) {
    console.trace(`Invalid key: ${key}`);
    throw new Error(`Invalid key: ${key}`);
  }
  if (!f.isValid(value)) {
    console.trace(`Invalid value for key: ${key}`);
    throw new Error(`Invalid value for key: ${key}`);
  }
  if (siteDataLabels(key) !== "plain") {
    value = JSON.stringify(RestoreSiteDataSecret(key, JSON.parse(value), await GetSiteDataByKey(key)));
  }
  const result = await db.insertOrUpdateSiteData(key, value, f.data_type);
  if (key === "oidcSettings") ClearOidcConfigCache();
  return result;
}

export async function GetAllSiteData(): Promise<SiteDataTransformed> {
  let data = await db.getAllSiteData();
  //return all data as key value pairs, transform using data_type
  const transformedData: Record<string, unknown> = {};
  for (const d of data) {
    if (d.data_type === "object") {
      transformedData[d.key] = JSON.parse(d.value);
    } else {
      transformedData[d.key] = d.value;
    }
  }
  return transformedData as unknown as SiteDataTransformed;
}

export const GetLocaleFromCookie = (site: SiteDataTransformed, cookies: Cookies): string => {
  let selectedLang = site.i18n?.defaultLocale || "en";
  const localLangCookie = cookies.get("localLang");
  if (!!localLangCookie && site.i18n?.locales?.find((l) => l.code === localLangCookie)) {
    selectedLang = localLangCookie;
  } else if (site.i18n?.defaultLocale && site.i18n?.locales?.length) {
    selectedLang = site.i18n.defaultLocale;
  }
  return selectedLang;
};

/**
 * Returns the site URL used for building absolute public URLs, without a trailing slash.
 * Prefers the configured siteURL and falls back to the ORIGIN env var; only absolute
 * http(s) values are returned. Returns an empty string when neither is usable, in which
 * case callers degrade to a relative path.
 */
export const GetSiteURL = async (): Promise<string> => {
  const siteURL = await GetSiteDataByKey("siteURL");
  for (const candidate of [siteURL, process.env.ORIGIN]) {
    if (typeof candidate === "string" && /^https?:\/\//i.test(candidate)) {
      return candidate.replace(/\/+$/, "");
    }
  }
  return "";
};

export const GetSiteLogoURL = async (siteURL: string, logo: string, base: string): Promise<string> => {
  if (logo.startsWith("http")) {
    return logo;
  }
  return siteURL + base + logo;
};

export async function GetAllAnalyticsData() {
  let data = await db.getAllSiteDataAnalytics();
  //return all data as key value pairs, transform using data_type
  let transformedData = [];
  for (const d of data) {
    transformedData.push({
      key: d.key,
      value: JSON.parse(d.value),
    });
  }
  return transformedData;
}
export async function GetAllCaptchaData() {
  let data = await db.getAllSiteDataByPrefix("captcha");
  //return all data as key value pairs, transform using data_type
  let transformedData = [];
  for (const d of data) {
    transformedData.push({
      key: d.key,
      value: JSON.parse(d.value),
    });
  }
  return transformedData;
}
export const GetSiteDataByKey = async (key: string): Promise<unknown> => {
  let data = await db.getSiteDataByKey(key);
  if (!data) {
    return null;
  }
  if (data.data_type == "object") {
    return JSON.parse(data.value);
  }
  return data.value;
};

/** Checks the env vars required for setup, without touching the database. */
export const HasRequiredEnv = (): boolean => {
  return !!process.env.KENER_SECRET_KEY && process.env.ORIGIN !== undefined && process.env.REDIS_URL !== undefined;
};

export const IsSetupComplete = async (): Promise<boolean> => {
  if (!HasRequiredEnv()) {
    return false;
  }
  let data = await db.getAllSiteData();

  if (!data) {
    return false;
  }
  return data.length > 0;
};
