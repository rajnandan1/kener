const seedSiteData = {
  title: "Kener - Open source status page system",
  siteName: "Kener.ing",
  siteURL: "http://localhost:3000",
  home: "/",
  logo: "/logo.png",
  favicon: "/logo96.png",
  metaTags: [
    {
      key: "description",
      value: "Add your description here",
    },
    {
      key: "og:description",
      value: "Add your description here",
    },
    { key: "og:image", value: "/newbg.png" },
    {
      key: "og:title",
      value: "Kener - Open source status page system",
    },
    { key: "og:type", value: "website" },
    { key: "og:site_name", value: "Kener" },
    { key: "twitter:card", value: "summary_large_image" },
    { key: "twitter:site", value: "@_rajnandan_" },
    { key: "twitter:creator", value: "@_rajnandan_" },
    { key: "twitter:image", value: "/newbg.png" },
    {
      key: "twitter:title",
      value: "Kener - Open source status page system",
    },
    {
      key: "twitter:description",
      value: "Add your description here",
    },
  ],
  nav: [
    { name: "Documentation", url: "https://kener.ing/docs/home", iconURL: "" },
    { name: "Github", iconURL: "", url: "https://github.com/rajnandan1/kener" },
    { name: "Login", iconURL: "", url: "/account/signin" },
  ],
  hero: {
    title: "Build stunning status pages in minutes",
    subtitle: "Let your users know what's going on.",
  },
  footerHTML: `<div
   class="container relative  mt-4 max-w-[655px]"
   >
   <div class="block items-center gap-4 px-8 md:flex-row md:gap-2 md:px-0 mx-auto">
      <p class="text-center text-xs leading-loose text-muted-foreground ">
         Made using 
         <a href="https://github.com/rajnandan1/kener" target="_blank"  class="font-medium underline underline-offset-4 hover:text-accent-foreground">
         Kener
         </a>
         an open source status page system built with Svelte and TailwindCSS.<br/>
         Created with ❤️ by <a href="https://rajnandan.com" target="_blank"  class="font-medium hover:text-accent-foreground underline underline-offset-4">Raj Nandan Sharma</a>.
      </p>
   </div>
</div>`,
  i18n: {
    defaultLocale: "en",
    locales: [{ code: "en", name: "English", selected: true, disabled: false }],
  },
  pattern: "none",
  analytics: [
    {
      id: "",
      type: "GA",
      name: "Google Analytics",
      script: "https://unpkg.com/@analytics/google-analytics@1.0.7/dist/@analytics/google-analytics.min.js",
    },
    {
      id: "",
      type: "AMPLITUDE",
      name: "Amplitude",
      script: "https://unpkg.com/@analytics/amplitude@0.1.3/dist/@analytics/amplitude.min.js",
    },
    {
      id: "",
      type: "MIXPANEL",
      name: "MixPanel",
      script: "https://unpkg.com/@analytics/mixpanel@0.4.0/dist/@analytics/mixpanel.min.js",
    },
  ],
  theme: "none",
  themeToggle: "YES",
  tzToggle: "YES",
  barStyle: "PARTIAL",
  barRoundness: "SHARP",
  summaryStyle: "CURRENT",
  colors: {
    UP: "#67ab95",
    DOWN: "#ca3038",
    DEGRADED: "#e6ca61",
    MAINTENANCE: "#6679cc",
    ACCENT: "#f4f4f5",
    ACCENT_FOREGROUND: "#e96e2d",
  },
  colorsDark: {
    UP: "#67ab95",
    DOWN: "#ca3038",
    DEGRADED: "#e6ca61",
    MAINTENANCE: "#6679cc",
    ACCENT: "#27272a",
    ACCENT_FOREGROUND: "#e96e2d",
  },
  font: {
    cssSrc: "",
    family: "",
  },
  categories: [{ name: "Home", description: "Monitors for Home Page", isHidden: false }],
  homeIncidentCount: 5,
  homeIncidentStartTimeWithin: 30,
  homeDataMaxDays: {
    desktop: {
      maxDays: 90,
      selectableDays: [1, 7, 14, 30, 60, 90],
    },
    mobile: {
      maxDays: 90,
      selectableDays: [1, 7, 14, 30, 60, 90],
    },
  },
  kenerTheme: "system",
  showSiteStatus: "NO",
  subscriptionsSettings: {
    enable: false,
    methods: {
      emails: {
        incidents: false,
        maintenances: false,
      },
    },
  },
  subMenuOptions: {
    showShareBadgeMonitor: true,
    showShareEmbedMonitor: true,
  },
  dataRetentionPolicy: {
    enabled: true,
    retentionDays: 90,
  },
  eventDisplaySettings: {
    incidents: {
      enabled: true,
      ongoing: { show: true },
      resolved: { show: true, maxCount: 5, daysInPast: 7 },
    },
    maintenances: {
      enabled: true,
      ongoing: {
        show: true,
      },
      past: { show: true, maxCount: 5, daysInPast: 7 },
      upcoming: { show: true, maxCount: 5, daysInFuture: 7 },
    },
  },
  globalPageVisibilitySettings: {
    showSwitcher: true,
    forceExclusivity: false,
  },
};

export default seedSiteData;
