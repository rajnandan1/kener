import db from "../db/db.js";
import { siteDataKeys } from "./siteDataKeys.js";
import type { Cookies } from "@sveltejs/kit";
import type {
  DataRetentionPolicy,
  EventDisplaySettings,
  GlobalPageVisibilitySettings,
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
  SiteSubscriptionsSettings,
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
}

export function InsertKeyValue(key: string, value: string): Promise<number[]> {
  let f = siteDataKeys.find((k) => k.key === key);
  if (!f) {
    console.trace(`Invalid key: ${key}`);
    throw new Error(`Invalid key: ${key}`);
  }
  if (!f.isValid(value)) {
    console.trace(`Invalid value for key: ${key}`);
    throw new Error(`Invalid value for key: ${key}`);
  }
  return db.insertOrUpdateSiteData(key, value, f.data_type);
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

export const IsSetupComplete = async (): Promise<boolean> => {
  if (process.env.KENER_SECRET_KEY === undefined) {
    return false;
  }
  let data = await db.getAllSiteData();

  if (!data) {
    return false;
  }
  return data.length > 0;
};
