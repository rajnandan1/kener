import MobileDetect from "mobile-detect";
import type { Cookies } from "@sveltejs/kit";
import type { UserRecordPublic } from "$lib/server/types/db";
import seedSiteData from "$lib/server/db/seedSiteData";
import {
  GetAllSiteData,
  GetLoggedInSession,
  GetLocaleFromCookie,
  GetUsersCount,
  IsEmailSetup,
  IsSetupComplete,
} from "./controller.js";
import type { EventDisplaySettings, GlobalPageVisibilitySettings } from "$lib/types/site.js";

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
    ctaURL: string | null;
    ctaText: string | null;
  };
  eventDisplaySettings: EventDisplaySettings;
  socialPreviewImage?: string;
  customCSS?: string;
  globalPageVisibilitySettings: GlobalPageVisibilitySettings;
}

export async function GetLayoutServerData(cookies: Cookies, request: Request): Promise<LayoutServerData> {
  const userAgent = request.headers.get("user-agent") ?? "";
  const md = new MobileDetect(userAgent);
  const isMobile = !!md.mobile();

  const [loggedInUser, siteData, userCounts] = await Promise.all([
    GetLoggedInSession(cookies),
    GetAllSiteData(),
    GetUsersCount(),
  ]);

  const isSetupComplete = await IsSetupComplete();

  const selectedLang = GetLocaleFromCookie(siteData, cookies);
  const siteStatusColors = siteData.colors;

  const siteStatusColorsDark = siteData.colorsDark || siteStatusColors;

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

  const languageSetting = {
    ...(siteData.i18n || seedSiteData.i18n),
    locales: (siteData.i18n?.locales || seedSiteData.i18n.locales).filter((l) => l.selected).map((l) => ({ ...l })),
  };
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
    eventDisplaySettings: siteData.eventDisplaySettings || seedSiteData.eventDisplaySettings,
    socialPreviewImage: siteData.socialPreviewImage,
    customCSS: siteData.customCSS,
    globalPageVisibilitySettings: siteData.globalPageVisibilitySettings || seedSiteData.globalPageVisibilitySettings,
  };
}
