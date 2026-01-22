<script lang="ts">
  import "../layout.css";
  import "../kener.css";
  import { ModeWatcher } from "mode-watcher";
  import { resolve } from "$app/paths";
  import KenerNav from "$lib/components/KenerNav.svelte";
  import KenerFooter from "$lib/components/KenerFooter.svelte";
  import * as Tooltip from "$lib/components/ui/tooltip/index.js";
  import { Toaster } from "$lib/components/ui/sonner/index.js";

  let base = resolve("/");

  let { children, data } = $props();
</script>

<ModeWatcher />

<Toaster />

<svelte:head>
  <title>Kener Status</title>
  <link rel="icon" href={data.favicon} />
  {@html `<style>:root{--up:${data.siteStatusColors.UP};--degraded:${data.siteStatusColors.DEGRADED};--down:${data.siteStatusColors.DOWN};--maintenance:${data.siteStatusColors.MAINTENANCE};}</style>`}
</svelte:head>
<main class="kener-public">
  <!-- Nav -->
  <KenerNav />
  <!-- Body -->
  <div class="mx-auto max-w-5xl pt-24">
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
</style>
