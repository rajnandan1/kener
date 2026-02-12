import MobileDetect from "mobile-detect";
import type { Cookies } from "@sveltejs/kit";
import type { PageNavItem } from "./dashboardController";
import type { UserRecordPublic } from "$lib/server/types/db";
import seedSiteData from "$lib/server/db/seedSiteData";
import {
  GetAllSiteData,
  IsSetupComplete,
  GetLoggedInSession,
  GetLocaleFromCookie,
  GetUsersCount,
  GetAllPages,
  IsEmailSetup,
} from "./controller.js";

export interface LayoutServerData {
  isMobile: boolean;
  isSetupComplete: boolean;
  isAdminAccountCreated: boolean;
  loggedInUser: UserRecordPublic | null;
  selectedLang: string;
  siteStatusColors: {
    UP: string;
    DOWN: string;
    DEGRADED: string;
    MAINTENANCE: string;
    ACCENT: string;
    ACCENT_FOREGROUND: string;
  };
  siteStatusColorsDark: {
    UP: string;
    DOWN: string;
    DEGRADED: string;
    MAINTENANCE: string;
    ACCENT: string;
    ACCENT_FOREGROUND: string;
  };
  navItems: Array<{ name: string; url: string; iconURL: string }>;
  allPages: PageNavItem[];
  siteName: string;
  siteUrl: string;
  logo: string | undefined;
  favicon: string | undefined;
  footerHTML: string;
  isSubsEnabled: boolean;
  languageSetting: {
    defaultLocale: string;
    locales: Array<{ code: string; name: string; selected: boolean; disabled: boolean }>;
  };
  subMenuOptions: {
    showCopyCurrentPageLink: boolean;
    showShareBadgeMonitor: boolean;
    showShareEmbedMonitor: boolean;
  };
  isTimezoneEnabled: boolean;
  isThemeToggleEnabled: boolean;
  defaultSiteTheme: string;
  font: {
    cssSrc: string;
    family: string;
  };
  canSendEmail: boolean;
  announcement?: {
    title: string;
    message: string;
    type: "INFO" | "WARNING" | "ERROR";
    reshowAfterInHours: number | null;
    cancellable: boolean;
    cta: string | null;
  };
}

export async function GetLayoutServerData(cookies: Cookies, request: Request): Promise<LayoutServerData> {
  const userAgent = request.headers.get("user-agent") ?? "";
  const md = new MobileDetect(userAgent);
  const isMobile = !!md.mobile();

  const isSetupComplete = await IsSetupComplete();
  const loggedInUser = await GetLoggedInSession(cookies);
  const siteData = await GetAllSiteData();
  const userCounts = await GetUsersCount();

  const selectedLang = GetLocaleFromCookie(siteData, cookies);
  const siteStatusColors = siteData.colors;
  const siteStatusColorsDark = siteData.colorsDark || siteStatusColors;

  const allPagesData = await GetAllPages();
  const allPages: PageNavItem[] = allPagesData.map((p) => ({
    page_title: p.page_title,
    page_path: p.page_path,
  }));

  // Check if subscription is enabled
  let isSubsEnabled = false;
  const subsSetting = siteData.subscriptionsSettings;
  if (
    subsSetting &&
    subsSetting.enable &&
    (subsSetting.methods.emails.incidents || subsSetting.methods.emails.maintenance)
  ) {
    isSubsEnabled = true;
  }

  const languageSetting = siteData.i18n;
  languageSetting.locales = languageSetting.locales.filter((l) => l.selected);
  const isTimezoneEnabled = !!siteData.tzToggle && siteData.tzToggle !== "NO";
  const isThemeToggleEnabled = !!siteData.themeToggle && siteData.themeToggle !== "NO";
  const defaultSiteTheme = siteData.theme || "system";
  const font = siteData.font || { cssSrc: "", family: "" };
  const canSendEmail = IsEmailSetup();
  return {
    isMobile,
    isSetupComplete,
    isAdminAccountCreated: userCounts ? Number(userCounts.count) > 0 : false,
    loggedInUser,
    selectedLang,
    siteStatusColors,
    siteStatusColorsDark,
    navItems: siteData.nav || [],
    allPages,
    siteName: siteData.siteName || "Kener",
    siteUrl: siteData.siteURL || "",
    logo: siteData.logo,
    favicon: siteData.favicon,
    footerHTML: siteData.footerHTML || "",
    isSubsEnabled,
    languageSetting,
    subMenuOptions: siteData.subMenuOptions || seedSiteData.subMenuOptions,
    isTimezoneEnabled,
    isThemeToggleEnabled,
    defaultSiteTheme,
    font,
    canSendEmail,
    announcement: siteData.announcement,
  };
}
