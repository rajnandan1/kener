<script lang="ts">
  import "../layout.css";
  import "../kener.css";
  import { onMount } from "svelte";
  import { ModeWatcher } from "mode-watcher";
  import KenerNav from "$lib/components/KenerNav.svelte";
  import KenerFooter from "$lib/components/KenerFooter.svelte";
  import { Button } from "$lib/components/ui/button/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import * as Popover from "$lib/components/ui/popover/index.js";
  import * as Tooltip from "$lib/components/ui/tooltip/index.js";
  import { Toaster } from "$lib/components/ui/sonner/index.js";
  import { invalidateAll } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { page } from "$app/state";
  import clientResolver from "$lib/client/resolver.js";
  import RefreshCw from "@lucide/svelte/icons/refresh-cw";
  import { t } from "$lib/stores/i18n";
  import { refreshStore } from "$lib/stores/refreshStore";

  let { children, data } = $props();

  const rssHref = $derived.by(() => {
    const params = page.params;
    if (params.monitor_tag) return clientResolver(resolve, `/monitors/${params.monitor_tag}/rss.xml`);
    if (params.page_path) return clientResolver(resolve, `/${params.page_path}/rss.xml`);
    return clientResolver(resolve, "/rss.xml");
  });

  let refreshInterval = $state(60);
  let refreshIntervalId: number | undefined;
  let refreshInProgress = $state(false);

  async function refreshPageData(): Promise<void> {
    if (refreshInProgress) return;

    refreshInProgress = true;

    try {
      await invalidateAll();
      refreshStore.updateLastRefresh();
    } catch (error) {
      console.error("Failed to refresh page data:", error);
    } finally {
      refreshInProgress = false;
    }
  }

  function startGlobalRefresh() {
    stopGlobalRefresh();
    refreshIntervalId = window.setInterval(() => {
      void refreshPageData();
    }, $refreshStore.interval * 1000);
  }

  function stopGlobalRefresh() {
    if (refreshIntervalId !== undefined) {
      clearInterval(refreshIntervalId);
      refreshIntervalId = undefined;
    }
  }

  function saveRefreshInterval() {
    refreshInterval = Math.max(5, Number(refreshInterval) || 60);
    localStorage.setItem("kener-global-refresh-interval", String(refreshInterval));
    refreshStore.setInterval(refreshInterval);
    if ($refreshStore.enabled) startGlobalRefresh();
  }

  function toggleGlobalRefresh() {
    refreshStore.toggle();
    localStorage.setItem("kener-global-refresh-enabled", String($refreshStore.enabled));

    if ($refreshStore.enabled) {
      startGlobalRefresh();
      void refreshPageData();
    } else {
      stopGlobalRefresh();
    }
  }

  onMount(() => {
    const savedInterval = Number(localStorage.getItem("kener-global-refresh-interval"));
    if (Number.isFinite(savedInterval) && savedInterval >= 5) refreshInterval = savedInterval;
    refreshStore.setInterval(refreshInterval);

    if (localStorage.getItem("kener-global-refresh-enabled") === "true") {
      refreshStore.setState({ ...$refreshStore, enabled: true });
      startGlobalRefresh();
    }

    return stopGlobalRefresh;
  });
</script>

<ModeWatcher defaultMode={data.defaultSiteTheme as 'light' | 'dark' | 'system'} />

<Toaster />

<svelte:head>
  <link
    rel="icon"
    href={data.favicon ? clientResolver(resolve, data.favicon) : data.favicon}
  />
  <link rel="alternate" type="application/rss+xml" title="RSS feed" href={rssHref} />
  {#if data.font?.cssSrc}
    <link rel="stylesheet" href={data.font.cssSrc} />
  {/if}
  {@html `
	<style id="dynamic-styles">
		body {
			--up: ${data.siteStatusColors.UP};
			--degraded: ${data.siteStatusColors.DEGRADED};
			--down: ${data.siteStatusColors.DOWN};
			--maintenance: ${data.siteStatusColors.MAINTENANCE};
			--accent: ${data.siteStatusColors.ACCENT || "#f4f4f5"};
			--accent-foreground: ${data.siteStatusColors.ACCENT_FOREGROUND || data.siteStatusColors.ACCENT || "#e96e2d"};
			${data.font?.family ? `--font-family:'${data.font.family}', sans-serif;` : ""}
		}
		:is(.dark) body {
			--up: ${data.siteStatusColorsDark.UP};
			--degraded: ${data.siteStatusColorsDark.DEGRADED};
			--down: ${data.siteStatusColorsDark.DOWN};
			--maintenance: ${data.siteStatusColorsDark.MAINTENANCE};
			--accent: ${data.siteStatusColorsDark.ACCENT || "#27272a"};
			--accent-foreground: ${data.siteStatusColorsDark.ACCENT_FOREGROUND || data.siteStatusColorsDark.ACCENT || "#e96e2d"};
		}
		${data.customCSS || ""}
	</style>`}
  <script src={clientResolver(resolve, "/capture.js")}></script>
</svelte:head>
{#snippet refreshControls()}
  <Popover.Root>
    <Popover.Trigger>
      {#snippet child({ props })}
        <Button
          {...props}
          variant="ghost"
          size="icon"
          aria-label={$t("Auto-Refresh")}
        >
          <RefreshCw
            class={`h-[1.2rem] w-[1.2rem] ${
              refreshInProgress ? "animate-spin" : ""
            }`}
          />
        </Button>
      {/snippet}
    </Popover.Trigger>
    <Popover.Content class="w-60">
      <div class="grid gap-4">
        <div class="space-y-2">
          <h4 class="font-medium leading-none">{$t("Auto-Refresh")}</h4>
          <p class="text-sm text-muted-foreground">{$t("auto-refresh-description")}</p>
        </div>
        <div class="grid gap-2">
          <div class="grid grid-cols-3 items-center gap-4">
            <label for="global-interval" class="text-xs">{$t("Interval")}</label>
            <Input
              id="global-interval"
              type="number"
              bind:value={refreshInterval}
              min="5"
              class="col-span-2 h-8"
              placeholder={$t("Seconds")}
              onchange={saveRefreshInterval}
            />
          </div>
          <Button onclick={toggleGlobalRefresh} size="sm">
            {$refreshStore.enabled ? $t("Disable") : $t("Enable")}
          </Button>
        </div>
      </div>
    </Popover.Content>
  </Popover.Root>
{/snippet}
<main class="kener-public status-page-app">
  <!-- Nav -->
  <KenerNav controls={refreshControls} />
  <!-- Body -->
  <div class="mx-auto max-w-5xl px-4 pt-18">
    <Tooltip.Provider>
      {@render children()}
    </Tooltip.Provider>
  </div>
  <KenerFooter />
</main>

<style>
  /* Apply the global font family using the CSS variable */
  * {
    font-family: var(--font-family);
  }

  /*
	:global(.text-3xl) {
		font-family: var(--font-family);
	}
	*/
</style>
