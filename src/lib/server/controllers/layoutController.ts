import MobileDetect from "mobile-detect";
import type { Cookies } from "@sveltejs/kit";
import type { UserRecordPublic } from "$lib/server/types/db";
import seedSiteData from "$lib/server/db/seedSiteData";
import {
  CanSeeHiddenMonitors,
  GetAllSiteData,
  GetLoggedInSession,
  GetLocaleFromCookie,
  GetUsersCount,
  HasRequiredEnv,
  IsEmailSetup,
} from "./controller.js";
import { GetMonitors, GetMonitorTagsLinkedToEvents } from "./monitorsController.js";
import { GetAllPages } from "./pagesController.js";
import type { EventDisplaySettings, GlobalPageVisibilitySettings, SiteDateTimeFormat } from "$lib/types/site.js";
import serverResolve from "../resolver.js";
import { ResolveEventListPlacement } from "$lib/clientTools";

export interface LayoutServerData {
  isMobile: boolean;
  isSetupComplete: boolean;
  isAdminAccountCreated: boolean;
  loggedInUser: UserRecordPublic | null;
  canSeeHiddenMonitors: boolean;
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
    contentTranslations?: Record<string, Record<string, string>>;
  };
  subMenuOptions: {
    showShareBadgeMonitor: boolean;
    showShareEmbedMonitor: boolean;
    showRssFeed: boolean;
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
  dateAndTimeFormat: SiteDateTimeFormat;
  metaSiteTitle?: string;
  metaSiteDescription?: string;
}

function NormalizeEventDisplaySettings(settings?: Partial<EventDisplaySettings>): EventDisplaySettings {
  const defaults = structuredClone(seedSiteData.eventDisplaySettings);

  return {
    showInlineEvents:
      typeof settings?.showInlineEvents === "boolean" ? settings.showInlineEvents : defaults.showInlineEvents,
    eventListPlacement: ResolveEventListPlacement(settings),
    incidents: {
      ...defaults.incidents,
      ...settings?.incidents,
      ongoing: {
        ...defaults.incidents.ongoing,
        ...settings?.incidents?.ongoing,
      },
      resolved: {
        ...defaults.incidents.resolved,
        ...settings?.incidents?.resolved,
      },
    },
    maintenances: {
      ...defaults.maintenances,
      ...settings?.maintenances,
      ongoing: {
        ...defaults.maintenances.ongoing,
        ...settings?.maintenances?.ongoing,
      },
      past: {
        ...defaults.maintenances.past,
        ...settings?.maintenances?.past,
      },
      upcoming: {
        ...defaults.maintenances.upcoming,
        ...settings?.maintenances?.upcoming,
      },
    },
  };
}

type ContentTranslations = Record<string, Record<string, string>>;

interface PublicTextSources {
  siteData: {
    siteName?: string;
    metaSiteTitle?: string;
    metaSiteDescription?: string;
    nav?: Array<{ name?: string }>;
    footerHTML?: string;
    announcement?: { title?: string; message?: string };
  };
  pages: Array<{
    page_title?: string | null;
    page_header?: string | null;
    page_subheader?: string | null;
    page_settings_json?: string | null;
  }>;
  monitors: Array<{ name?: string | null; description?: string | null; is_hidden?: string | null }>;
  canSeeHiddenMonitors: boolean;
}

/**
 * The texts the public pages show right now, as trimmed strings. A hidden monitor's name and
 * description count only for a visitor who can see hidden monitors.
 */
export function GetPublicContentTexts({
  siteData,
  pages,
  monitors,
  canSeeHiddenMonitors,
}: PublicTextSources): Set<string> {
  const texts: unknown[] = [
    siteData.siteName,
    siteData.metaSiteTitle,
    siteData.metaSiteDescription,
    siteData.footerHTML,
    siteData.announcement?.title,
    siteData.announcement?.message,
    ...(siteData.nav || []).map((item) => item.name),
  ];
  for (const page of pages) {
    texts.push(page.page_title, page.page_header, page.page_subheader);
    try {
      const settings = JSON.parse(page.page_settings_json || "{}");
      texts.push(settings?.metaPageTitle, settings?.metaPageDescription);
    } catch {
      // A page with unreadable settings has no meta texts to translate
    }
  }
  for (const monitor of monitors) {
    if (monitor.is_hidden === "YES" && !canSeeHiddenMonitors) continue;
    texts.push(monitor.name, monitor.description);
  }
  return new Set(
    texts.filter((text): text is string => typeof text === "string" && text.trim() !== "").map((text) => text.trim()),
  );
}

/**
 * Keeps only the translations whose source text a public page shows right now. The public layout
 * sends the dictionary with its source texts, so an entry for a hidden monitor, or for a text
 * that was renamed or deleted, must not reach visitors.
 */
export function KeepPublicContentTranslations(
  contentTranslations: ContentTranslations,
  publicTexts: Set<string>,
): ContentTranslations {
  return Object.fromEntries(
    Object.entries(contentTranslations).map(([locale, mappings]) => [
      locale,
      Object.fromEntries(Object.entries(mappings).filter(([source]) => publicTexts.has(source.trim()))),
    ]),
  );
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
  const canSeeHiddenMonitors = await CanSeeHiddenMonitors(loggedInUser);

  // Same check as IsSetupComplete, but reuses the site data fetched above
  // instead of querying it a second time on every request
  const isSetupComplete = HasRequiredEnv() && Object.keys(siteData).length > 0;

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

  const languageSetting: LayoutServerData["languageSetting"] = {
    ...(siteData.i18n || seedSiteData.i18n),
    locales: (siteData.i18n?.locales || seedSiteData.i18n.locales).filter((l) => l.selected).map((l) => ({ ...l })),
  };
  if (languageSetting.contentTranslations && Object.keys(languageSetting.contentTranslations).length > 0) {
    // Status pages show ACTIVE monitors; incident and maintenance pages show their linked monitors
    // whatever their status
    const [pages, allMonitors, eventMonitorTags] = await Promise.all([
      GetAllPages(),
      GetMonitors({}),
      GetMonitorTagsLinkedToEvents(),
    ]);
    const linkedToEvents = new Set(eventMonitorTags);
    const monitors = allMonitors.filter((monitor) => monitor.status === "ACTIVE" || linkedToEvents.has(monitor.tag));
    languageSetting.contentTranslations = KeepPublicContentTranslations(
      languageSetting.contentTranslations,
      GetPublicContentTexts({ siteData, pages, monitors, canSeeHiddenMonitors }),
    );
  }
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
    canSeeHiddenMonitors,
    selectedLang,
    siteStatusColors,
    siteStatusColorsDark,
    navItems: siteData.nav || [],
    siteName: siteData.siteName || "Kener",
    siteUrl: siteData.siteURL || "",
    logo: siteData.logo,
    // Browsers fetch <link rel="icon"> from the SSR HTML before hydration.
    // SvelteKit's resolve() uses a relative base on the app-root page, so
    // prefix KENER_BASE_PATH here instead of in the layout.
    favicon: siteData.favicon ? serverResolve(siteData.favicon) : siteData.favicon,
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
    eventDisplaySettings: NormalizeEventDisplaySettings(siteData.eventDisplaySettings),
    socialPreviewImage: siteData.socialPreviewImage,
    customCSS: siteData.customCSS,
    globalPageVisibilitySettings: siteData.globalPageVisibilitySettings || seedSiteData.globalPageVisibilitySettings,
    dateAndTimeFormat: siteData.dateAndTimeFormat || seedSiteData.dateAndTimeFormat,
    metaSiteTitle: siteData.metaSiteTitle,
    metaSiteDescription: siteData.metaSiteDescription,
  };
}
