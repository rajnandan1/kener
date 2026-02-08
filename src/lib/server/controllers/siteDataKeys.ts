import {
  IsValidAnalytics,
  IsValidColors,
  IsValidHero,
  IsValidI18n,
  IsValidJSONArray,
  IsValidJSONString,
  IsValidNav,
  IsValidURL,
} from "./validators.js";

interface SiteDataKey {
  key: string;
  isValid: (value: string) => boolean;
  data_type: string;
}

export const siteDataKeys: SiteDataKey[] = [
  {
    key: "title",
    isValid: (value) => typeof value === "string" && value.trim().length > 0,
    data_type: "string",
  },
  {
    key: "siteName",
    isValid: (value) => typeof value === "string" && value.trim().length > 0,
    data_type: "string",
  },
  {
    key: "siteURL",
    isValid: IsValidURL,
    data_type: "string",
  },
  {
    key: "homeDataMaxDays",
    isValid: IsValidJSONString,
    data_type: "object",
  },
  {
    key: "home",
    isValid: (value) => typeof value === "string" && value.trim().length > 0,
    data_type: "string",
  },
  {
    key: "favicon",
    isValid: (value) => typeof value === "string" && value.trim().length > 0,
    data_type: "string",
  },
  {
    key: "logo",
    isValid: (value) => typeof value === "string" && value.trim().length > 0,
    data_type: "string",
  },
  {
    key: "metaTags",
    isValid: IsValidJSONString,
    data_type: "object",
  },
  {
    key: "nav",
    isValid: IsValidNav,
    data_type: "object",
  },
  {
    key: "hero",
    isValid: IsValidHero,
    data_type: "object",
  },
  {
    key: "footerHTML",
    isValid: (value) => typeof value === "string",
    data_type: "string",
  },
  {
    key: "kenerTheme",
    isValid: (value) => typeof value === "string",
    data_type: "string",
  },
  {
    key: "customCSS",
    isValid: (value) => typeof value === "string",
    data_type: "string",
  },
  {
    key: "i18n",
    isValid: IsValidI18n,
    data_type: "object",
  },
  {
    key: "pattern",
    //string dots or squares or circle
    isValid: (value) =>
      typeof value === "string" &&
      [
        "dots",
        "squares",
        "tiles",
        "none",
        "radial-blue",
        "radial-mono",
        "radial-midnight",
        "circle-mono",
        "carbon-fibre",
        "texture-sky",
        "angular-mono",
        "angular-spring",
        "angular-bloom",
        "pets",
      ].includes(value),
    data_type: "string",
  },
  {
    key: "analytics",
    isValid: IsValidAnalytics,
    data_type: "object",
  },
  {
    key: "theme",
    //light dark system none
    isValid: (value) => typeof value === "string" && ["light", "dark", "system", "none"].includes(value),
    data_type: "string",
  },
  {
    key: "themeToggle",
    //boolean
    isValid: (value) => typeof value === "string",
    data_type: "string",
  },
  {
    key: "tzToggle",
    //boolean
    isValid: (value) => typeof value === "string",
    data_type: "string",
  },
  {
    key: "showSiteStatus",
    //boolean
    isValid: (value) => typeof value === "string",
    data_type: "string",
  },
  {
    key: "barStyle",
    //PARTIAL or FULL
    isValid: (value) => typeof value === "string" && ["PARTIAL", "FULL"].includes(value),
    data_type: "string",
  },
  {
    key: "barRoundness",
    //SHARP or ROUNDED
    isValid: (value) => typeof value === "string" && ["SHARP", "ROUNDED"].includes(value),
    data_type: "string",
  },
  {
    key: "summaryStyle",
    //CURRENT or DAY
    isValid: (value) => typeof value === "string" && ["CURRENT", "DAY"].includes(value),
    data_type: "string",
  },
  {
    key: "colors",
    isValid: IsValidColors,
    data_type: "object",
  },
  {
    key: "colorsDark",
    isValid: IsValidColors,
    data_type: "object",
  },
  {
    key: "font",
    isValid: IsValidJSONString,
    data_type: "object",
  },
  {
    key: "monitorSort",
    isValid: IsValidJSONArray,
    data_type: "object",
  },
  {
    key: "categories",
    isValid: IsValidJSONString,
    data_type: "object",
  },
  {
    key: "homeIncidentCount",
    isValid: (value) => parseInt(value) >= 0,
    data_type: "string",
  },
  {
    key: "homeIncidentStartTimeWithin",
    isValid: (value) => parseInt(value) >= 1,
    data_type: "string",
  },
  {
    key: "incidentGroupView",
    isValid: (value) => typeof value === "string" && value.trim().length > 0,
    data_type: "string",
  },
  {
    key: "analytics.googleTagManager",
    isValid: IsValidJSONString,
    data_type: "object",
  },
  {
    key: "analytics.plausible",
    isValid: IsValidJSONString,
    data_type: "object",
  },
  {
    key: "analytics.mixpanel",
    isValid: IsValidJSONString,
    data_type: "object",
  },
  {
    key: "analytics.amplitude",
    isValid: IsValidJSONString,
    data_type: "object",
  },
  {
    key: "analytics.clarity",
    isValid: IsValidJSONString,
    data_type: "object",
  },
  {
    key: "analytics.umami",
    isValid: IsValidJSONString,
    data_type: "object",
  },
  {
    key: "analytics.posthog",
    isValid: IsValidJSONString,
    data_type: "object",
  },
  {
    key: "subscriptionsSettings",
    isValid: IsValidJSONString,
    data_type: "object",
  },
  {
    key: "subMenuOptions",
    isValid: IsValidJSONString,
    data_type: "object",
  },
];
