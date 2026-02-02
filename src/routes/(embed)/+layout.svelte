<script lang="ts">
  import "../layout.css";
  import "../kener.css";
  import "../embed.css";
  import { ModeWatcher } from "mode-watcher";
  import { resolve } from "$app/paths";
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
  {@html `<style>:root{--up:${data.siteStatusColors.UP};--degraded:${data.siteStatusColors.DEGRADED};--down:${data.siteStatusColors.DOWN};--maintenance:${data.siteStatusColors.MAINTENANCE};${data.font?.family ? `--font-family:'${data.font.family}', sans-serif;` : ""}}</style>`}
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
