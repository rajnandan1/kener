<script>
  import "../../../../app.postcss";
  import "../../../../kener.css";
  import "../../../../manage.css";
  import { base } from "$app/paths";
  import { setMode, mode, ModeWatcher } from "mode-watcher";
  setMode("dark");
</script>

<ModeWatcher />
<svelte:head>
  <meta name="description" content="Set up Kener" />
  <meta name="robots" content="noindex" />
  <link rel="icon" href="{base}/logo96.png" />
</svelte:head>

<main class="setup">
  <slot></slot>
</main>
