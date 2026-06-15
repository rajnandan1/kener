<script lang="ts">
  import "../layout.css";
  import "../kener.css";
  import { ModeWatcher } from "mode-watcher";
  import KenerNav from "$lib/components/KenerNav.svelte";
  import KenerFooter from "$lib/components/KenerFooter.svelte";
  import * as Tooltip from "$lib/components/ui/tooltip/index.js";
  import { Toaster } from "$lib/components/ui/sonner/index.js";
  import { resolve } from "$app/paths";
  import { page } from "$app/state";
  import clientResolver from "$lib/client/resolver.js";

  let { children, data } = $props();

  const rssHref = $derived.by(() => {
    const params = page.params;
    if (params.monitor_tag) return clientResolver(resolve, `/monitors/${params.monitor_tag}/rss.xml`);
    if (params.page_path) return clientResolver(resolve, `/${params.page_path}/rss.xml`);
    return clientResolver(resolve, "/rss.xml");
  });
</script>

<ModeWatcher />

<Toaster />

<svelte:head>
  <link rel="icon" href={data.favicon} />
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
<main class="kener-public">
  <!-- Nav -->
  <KenerNav />
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
