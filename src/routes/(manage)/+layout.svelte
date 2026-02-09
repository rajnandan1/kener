<script lang="ts">
  import "../layout.css";
  import "../kener.css";
  import "../manage.css";
  import favicon from "$lib/assets/favicon.svg";
  import { ModeWatcher } from "mode-watcher";
  import { resolve } from "$app/paths";
  import { page } from "$app/state";
  import * as Sidebar from "$lib/components/ui/sidebar/index.js";
  import BlendIcon from "@lucide/svelte/icons/blend";
  import MailboxIcon from "@lucide/svelte/icons/mailbox";
  import AppSidebar from "./manage/app-sidebar.svelte";
  import Settings2Icon from "@lucide/svelte/icons/settings-2";
  import GlobeIcon from "@lucide/svelte/icons/globe";
  import SirenIcon from "@lucide/svelte/icons/siren";
  import BellIcon from "@lucide/svelte/icons/bell";
  import CodeIcon from "@lucide/svelte/icons/code";
  import ChartSplineIcon from "@lucide/svelte/icons/chart-spline";
  import CloudAlertIcon from "@lucide/svelte/icons/cloud-alert";
  import House from "@lucide/svelte/icons/house";
  import BadgeIcon from "@lucide/svelte/icons/id-card";
  import ClockAlertIcon from "@lucide/svelte/icons/clock-alert";
  import BookOpenIcon from "@lucide/svelte/icons/book-open";
  import KeyIcon from "@lucide/svelte/icons/key";
  import UsersIcon from "@lucide/svelte/icons/users";
  import Columns3CogIcon from "@lucide/svelte/icons/columns-3-cog";
  import SiteHeader from "./manage/site-header.svelte";
  import TemplateIcon from "@lucide/svelte/icons/layout-template";
  import clientResolver from "$lib/client/resolver.js";
  import DatabaseIcon from "@lucide/svelte/icons/database";

  import { Toaster } from "$lib/components/ui/sonner/index.js";
  import * as Tooltip from "$lib/components/ui/tooltip/index.js";

  // Navigation items - single source of truth
  const navItems = [
    { title: "Home", url: "/manage/app/home", icon: House },
    { title: "Monitors", url: "/manage/app/monitors", icon: BlendIcon },
    { title: "Triggers", url: "/manage/app/triggers", icon: MailboxIcon },
    { title: "Site Configurations", url: "/manage/app/site-configurations", icon: Settings2Icon },
    { title: "API Keys", url: "/manage/app/api-keys", icon: KeyIcon },
    { title: "Internationalization", url: "/manage/app/internationalization", icon: GlobeIcon },
    { title: "Customizations", url: "/manage/app/customizations", icon: Columns3CogIcon },
    { title: "Pages", url: "/manage/app/pages", icon: BookOpenIcon },
    { title: "Incidents", url: "/manage/app/incidents", icon: CloudAlertIcon },
    { title: "Maintenances", url: "/manage/app/maintenances", icon: ClockAlertIcon },
    { title: "Analytics Providers", url: "/manage/app/analytics-providers", icon: ChartSplineIcon },
    { title: "Alerts", url: "/manage/app/alerts", icon: SirenIcon },
    { title: "Subscriptions", url: "/manage/app/subscriptions", icon: BellIcon },
    { title: "Users", url: "/manage/app/users", icon: UsersIcon },
    { title: "Badges", url: "/manage/app/badges", icon: BadgeIcon },
    { title: "Embed", url: "/manage/app/embed", icon: CodeIcon },
    { title: "Templates", url: "/manage/app/templates", icon: TemplateIcon },
    { title: "Monitoring Data", url: "/manage/app/monitoring-data", icon: DatabaseIcon }
  ].map((item) => ({ ...item, url: clientResolver(resolve, item.url) }));

  // Derive page title from current URL
  let pageTitle = $derived(navItems.find((item) => page.url.pathname.startsWith(item.url))?.title || "Dashboard");

  let { children, data } = $props();
</script>

<ModeWatcher />
<Toaster />

<svelte:head>
  <title>{pageTitle} | Kener</title>
  <link rel="icon" href={clientResolver(resolve, "/logo96.png")} />
  {#if data.font?.cssSrc}
    <link rel="stylesheet" href={data.font.cssSrc} />
  {/if}
  {@html `
	<style>
		.kener-manage {
			--up: ${data.siteStatusColors.UP};
			--degraded: ${data.siteStatusColors.DEGRADED};
			--down: ${data.siteStatusColors.DOWN};
			--maintenance: ${data.siteStatusColors.MAINTENANCE};
			--accent: ${data.siteStatusColors.ACCENT || "#f4f4f5"};
			--accent-foreground: ${data.siteStatusColors.ACCENT_FOREGROUND || data.siteStatusColors.ACCENT || "#e96e2d"};
			${data.font?.family ? `--font-family:'${data.font.family}', sans-serif;` : ""}
		}
		:is(.dark) .kener-manage {
			--up: ${data.siteStatusColorsDark.UP};
			--degraded: ${data.siteStatusColorsDark.DEGRADED};
			--down: ${data.siteStatusColorsDark.DOWN};
			--maintenance: ${data.siteStatusColorsDark.MAINTENANCE};
			--accent: ${data.siteStatusColorsDark.ACCENT || "#27272a"};
			--accent-foreground: ${data.siteStatusColorsDark.ACCENT_FOREGROUND || data.siteStatusColorsDark.ACCENT || "#e96e2d"};
		}
	</style>`}
</svelte:head>
<main class="kener-manage">
  <Sidebar.Provider style="--sidebar-width: calc(var(--spacing) * 72); --header-height: calc(var(--spacing) * 12);">
    <AppSidebar variant="inset" {navItems} />
    <Sidebar.Inset>
      <SiteHeader title={pageTitle} />
      <div class="p-4">
        <div class="@container/main flex flex-1">
          <Tooltip.Provider>
            {@render children()}
          </Tooltip.Provider>
        </div>
      </div>
    </Sidebar.Inset>
  </Sidebar.Provider>
</main>

<style>
  /* Apply the global font family using the CSS variable */
  * {
    font-family: var(--font-family);
  }
</style>
