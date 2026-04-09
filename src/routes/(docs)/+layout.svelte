<script lang="ts">
  import "../layout.css";
  import "../kener.css";
  import "../docs.css";
  import "../prose.css";
  import "highlight.js/styles/github-dark.css";
  import { ModeWatcher } from "mode-watcher";
  import { Toaster } from "$lib/components/ui/sonner/index.js";

  let { children } = $props();
</script>

<ModeWatcher />
<Toaster />

<main>
  {@render children()}
</main>

<style>
  /* Apply the global font family using the CSS variable */
  * {
    font-family: var(--font-family);
  }
</style>
