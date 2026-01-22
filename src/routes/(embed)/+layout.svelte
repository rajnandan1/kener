<script lang="ts">
  import "../layout.css";
  import "../kener.css";
  import "../embed.css";
  import { ModeWatcher } from "mode-watcher";
  import { resolve } from "$app/paths";
  import { Toaster } from "$lib/components/ui/sonner/index.js";

  let base = resolve("/");

  let { children, data } = $props();

  const colorUp = $derived(data.siteStatusColors.UP);
  const colorDegraded = $derived(data.siteStatusColors.DEGRADED);
  const colorDown = $derived(data.siteStatusColors.DOWN);
  const colorMaintenance = $derived(data.siteStatusColors.MAINTENANCE);
  import KenerNav from "$lib/components/KenerNav.svelte";
</script>

<ModeWatcher />
<Toaster />

<svelte:head>
  {@html `<style>:root{--up:${colorUp};--degraded:${colorDegraded};--down:${colorDown};--maintenance:${colorMaintenance};}</style>`}
</svelte:head>
<main>
  {@render children()}
</main>

<style>
  /* Apply the global font family using the CSS variable */
  * {
    font-family: var(--font-family);
  }
</style>
