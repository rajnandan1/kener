const seedSiteData = {
  title: "Kener - Open source status page system",
  siteName: "Kener.ing",
  siteURL: "https://kener.ing",
  home: "/",
  logo: "https://kener.ing/logo.png",
  favicon: "https://kener.ing/logo96.png",
  metaTags: [
    {
      key: "description",
      value:
        "Kener: Open-source modern looking Node.js status page tool, designed to make service monitoring and incident handling a breeze. It offers a sleek and user-friendly interface that simplifies tracking service outages and improves how we communicate during incidents. And the best part? Kener integrates seamlessly with GitHub, making incident management a team effort—making it easier for us to track and fix issues together in a collaborative and friendly environment.",
    },
    {
      key: "og:description",
      value:
        "Kener: Open-source Node.js status page tool, designed to make service monitoring and incident handling a breeze. It offers a sleek and user-friendly interface that simplifies tracking service outages and improves how we communicate during incidents. And the best part? Kener integrates seamlessly with GitHub, making incident management a team effort—making it easier for us to track and fix issues together in a collaborative and friendly environment.",
    },
    { key: "og:image", value: "https://kener.ing/ss.png" },
    {
      key: "og:title",
      value: "Kener - Open source status page system",
    },
    { key: "og:type", value: "website" },
    { key: "og:site_name", value: "Kener" },
    { key: "twitter:card", value: "summary_large_image" },
    { key: "twitter:site", value: "@_rajnandan_" },
    { key: "twitter:creator", value: "@_rajnandan_" },
    { key: "twitter:image", value: "https://kener.ing/ss.png" },
    {
      key: "twitter:title",
      value: "Kener - Open source status page system",
    },
    {
      key: "twitter:description",
      value:
        "Kener: Open-source Node.js status page tool, designed to make service monitoring and incident handling a breeze. It offers a sleek and user-friendly interface that simplifies tracking service outages and improves how we communicate during incidents. And the best part? Kener integrates seamlessly with GitHub, making incident management a team effort—making it easier for us to track and fix issues together in a collaborative and friendly environment.",
    },
  ],
  nav: [
    { name: "Documentation", url: "https://kener.ing/docs/home", iconURL: "" },
    { name: "Github", iconURL: "", url: "https://github.com/rajnandan1/kener" },
    { name: "Login", iconURL: "", url: "/manage/signin" },
  ],
  hero: {
    title: "Build stunning status pages in minutes",
    subtitle: "Let your users know what's going on.",
  },
  footerHTML:
    '<p class="text-center">\nMade using \n<a href="https://github.com/rajnandan1/kener" target="_blank" rel="noreferrer" class="font-medium underline underline-offset-4">\n  Kener\n</a>\nan open source status page system built with Svelte and TailwindCSS.<br/>\nCreated with ❤️ by <a href="https://rajnandan.com" target="_blank" rel="noreferrer" class="font-medium underline underline-offset-4">Raj Nandan Sharma</a>.\n</p>\n',
  i18n: {
    defaultLocale: "en",
    locales: [{ code: "en", name: "English", selected: true, disabled: false }],
  },
  pattern: "none",
  analytics: [
    {
      id: "G-Q3MLRXCBFT",
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
  barStyle: "PARTIAL",
  barRoundness: "SHARP",
  summaryStyle: "CURRENT",
  colors: {
    UP: "#67ab95",
    DOWN: "#ca3038",
    DEGRADED: "#e6ca61",
  },
  font: {
    cssSrc:
      "https://fonts.bunny.net/css?family=albert-sans:100,100i,200,200i,300,300i,400,400i,500,500i,600,600i,700,700i,800,800i,900,900i&display=swap",
    family: "Albert Sans",
  },
  categories: [{ name: "Home", description: "Monitors for Home Page" }],
  homeIncidentCount: 5,
  homeIncidentStartTimeWithin: 30,
};

export default seedSiteData;
