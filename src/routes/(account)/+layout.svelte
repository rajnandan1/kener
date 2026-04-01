<script lang="ts">
  import "../layout.css";
  import "../kener.css";
  import "../public-shell.css";
  import { ModeWatcher } from "mode-watcher";
  import { resolve } from "$app/paths";
  import { Toaster } from "$lib/components/ui/sonner/index.js";
  import clientResolver from "$lib/client/resolver.js";
  import PublicFrame from "$lib/components/PublicFrame.svelte";

  let { children, data } = $props();
</script>

<ModeWatcher />
<Toaster />

<svelte:head>
  <meta name="robots" content="noindex, nofollow" />
  <link rel="icon" href={data.favicon} />
  {@html `
	<style id="dynamic-styles">
		body {
			--up: ${data.siteStatusColors.UP};
			--degraded: ${data.siteStatusColors.DEGRADED};
			--down: ${data.siteStatusColors.DOWN};
			--maintenance: ${data.siteStatusColors.MAINTENANCE};
			--accent: ${data.siteStatusColors.ACCENT || "#f4f4f5"};
			--accent-foreground: ${data.siteStatusColors.ACCENT_FOREGROUND || data.siteStatusColors.ACCENT || "#e96e2d"};
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

<PublicFrame footerHTML={data.footerHTML}>
  {@render children()}
</PublicFrame>
