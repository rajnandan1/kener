<script lang="ts">
  import "../layout.css";
  import "../kener.css";
  import "../docs.css";
  import "../prose.css";
  import "highlight.js/styles/github-dark.css";
  import { ModeWatcher } from "mode-watcher";
  import { resolve } from "$app/paths";
  import { Toaster } from "$lib/components/ui/sonner/index.js";

  let base = resolve("/");

  let { children, data } = $props();
</script>

<ModeWatcher />
<Toaster />

<svelte:head>
  <!-- Docs-only font. A <link> here rather than an @import in docs.css so it does not ride along in the
       single CSS bundle and get fetched by every status page. -->
  <link rel="stylesheet" href="https://fonts.bunny.net/css?family=geist:400,500,600,700|geist-mono:400,500" />
</svelte:head>

<main class="kener-docs">
  {@render children()}
</main>
