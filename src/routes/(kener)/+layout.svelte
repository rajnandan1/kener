<script lang="ts">
  import "../layout.css";
  import "../kener.css";
  import { ModeWatcher } from "mode-watcher";
  import KenerNav from "$lib/components/KenerNav.svelte";
  import KenerFooter from "$lib/components/KenerFooter.svelte";
  import * as Tooltip from "$lib/components/ui/tooltip/index.js";
  import { Toaster } from "$lib/components/ui/sonner/index.js";

  let { children, data } = $props();
</script>

<ModeWatcher />

<Toaster />

<svelte:head>
  <title>Kener Status</title>
  <link rel="icon" href={data.favicon} />
  {#if data.font?.cssSrc}
    <link rel="stylesheet" href={data.font.cssSrc} />
  {/if}
  {@html `
	<style id="dynamic-styles">
		.kener-public {
			--up: ${data.siteStatusColors.UP};
			--degraded: ${data.siteStatusColors.DEGRADED};
			--down: ${data.siteStatusColors.DOWN};
			--maintenance: ${data.siteStatusColors.MAINTENANCE};
			--accent: ${data.siteStatusColors.ACCENT || "#f4f4f5"};
			--accent-foreground: ${data.siteStatusColors.ACCENT_FOREGROUND || data.siteStatusColors.ACCENT || "#e96e2d"};
			${data.font?.family ? `--font-family:'${data.font.family}', sans-serif;` : ""}
		}
		:is(.dark) .kener-public {
			--up: ${data.siteStatusColorsDark.UP};
			--degraded: ${data.siteStatusColorsDark.DEGRADED};
			--down: ${data.siteStatusColorsDark.DOWN};
			--maintenance: ${data.siteStatusColorsDark.MAINTENANCE};
			--accent: ${data.siteStatusColorsDark.ACCENT || "#27272a"};
			--accent-foreground: ${data.siteStatusColorsDark.ACCENT_FOREGROUND || data.siteStatusColorsDark.ACCENT || "#e96e2d"};
		}
	</style>`}
</svelte:head>
<main class="kener-public">
  <!-- Nav -->
  <KenerNav />
  <!-- Body -->
  <div class="mx-auto max-w-5xl pt-18">
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
