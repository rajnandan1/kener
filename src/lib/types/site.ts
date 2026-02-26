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
}

export interface DataRetentionPolicy {
  enabled: boolean;
  retentionDays: number;
}

export interface EventDisplaySettings {
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
