import db from "../db/db.js";
import { siteDataKeys } from "./siteDataKeys.js";
import type { Cookies } from "@sveltejs/kit";
import { addMonths, format, startOfMonth, subMonths } from "date-fns";

export interface SiteDataTransformed {
  title?: string;
  siteName?: string;
  siteURL: string;
  home?: string;
  logo?: string;
  favicon?: string;
  metaTags?: Array<{ key: string; value: string }>;
  nav?: Array<{ name: string; url: string; iconURL: string }>;
  hero?: {
    title: string;
    subtitle: string | null;
    image: string | null;
  };
  footerHTML?: string;
  i18n: {
    defaultLocale: string;
    locales: Array<{ code: string; name: string; selected: boolean; disabled: boolean }>;
  };
  pattern?: string;
  analytics?: Array<{
    id: string;
    type: string;
    name: string;
    script: string;
  }>;
  theme?: string;
  themeToggle?: string;
  tzToggle?: string;
  barStyle: string;
  barRoundness?: string;
  summaryStyle?: string;
  colors: {
    UP: string;
    DOWN: string;
    DEGRADED: string;
    MAINTENANCE: string;
  };
  font: {
    cssSrc: string;
    family: string;
  };
  categories?: Array<{ name: string; description: string; isHidden: boolean; image: string | null }>;
  homeIncidentCount?: number | null;
  homeIncidentStartTimeWithin?: number;
  homeDataMaxDays?: {
    desktop: {
      maxDays: number;
      selectableDays: number[];
    };
    mobile: {
      maxDays: number;
      selectableDays: number[];
    };
  };
  kenerTheme?: string;
  showSiteStatus?: string;
  monitorSort?: number[];
  [key: string]: unknown;
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
  let transformedData = {} as SiteDataTransformed;
  for (const d of data) {
    if (d.data_type === "object") {
      transformedData[d.key] = JSON.parse(d.value);
    } else {
      transformedData[d.key] = d.value;
    }
  }
  return transformedData;
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

export const GetSiteMap = async (cookies: Cookies): Promise<string> => {
  let siteMapData: Array<{ url: string; lastmod: string; priority: number }> = [];
  let siteURLData = (await GetSiteDataByKey("siteURL")) as string;
  let categories = (await GetSiteDataByKey("categories")) as Array<{ name: string }> | null;
  let navs = (await GetSiteDataByKey("nav")) as Array<{ url: string }> | null;
  if (!!siteURLData) {
    siteMapData.push({
      url: siteURLData,
      lastmod: new Date().toISOString(),
      priority: 1,
    });
  }

  //get today's date in January-2025 format date-fns
  const today = format(new Date(), "LLLL-yyyy");
  //last month
  const lastMonth = format(subMonths(new Date(), 1), "LLLL-yyyy");
  const nextMonth = format(addMonths(new Date(), 1), "LLLL-yyyy");

  siteMapData.push({
    url: siteURLData + "/incidents/" + today,
    lastmod: startOfMonth(new Date()).toISOString(),
    priority: 0.9,
  });
  siteMapData.push({
    url: siteURLData + "/incidents/" + lastMonth,
    lastmod: startOfMonth(new Date()).toISOString(),
    priority: 0.9,
  });
  siteMapData.push({
    url: siteURLData + "/incidents/" + nextMonth,
    lastmod: startOfMonth(new Date()).toISOString(),
    priority: 0.9,
  });

  if (!!categories) {
    for (let i = 0; i < categories.length; i++) {
      if (categories[i].name !== "Home") {
        siteMapData.push({
          url: siteURLData + "?category=" + categories[i].name,
          lastmod: new Date().toISOString(),
          priority: 0.9,
        });
      }
    }
  }
  if (!!navs) {
    for (let i = 0; i < navs.length; i++) {
      if (navs[i].url.startsWith(siteURLData)) {
        siteMapData.push({
          url: navs[i].url,
          lastmod: new Date().toISOString(),
          priority: 0.9,
        });
      } else if (navs[i].url.startsWith("/")) {
        siteMapData.push({
          url: siteURLData + navs[i].url,
          lastmod: new Date().toISOString(),
          priority: 0.9,
        });
      }
    }
  }

  let monitors = await db.getMonitors({ status: "ACTIVE" });

  for (let i = 0; i < monitors.length; i++) {
    siteMapData.push({
      url: siteURLData + "?monitor=" + monitors[i].tag,
      lastmod: new Date(monitors[i].updated_at).toISOString(),
      priority: 0.8,
    });
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
	${siteMapData
    .map(
      (page) => `
	<url>
		<loc>${page.url}</loc>
		<lastmod>${page.lastmod}</lastmod>
		<priority>${page.priority}</priority>
	</url>
	`,
    )
    .join("")}
</urlset>`;
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
