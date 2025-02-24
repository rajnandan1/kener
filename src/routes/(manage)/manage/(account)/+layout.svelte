<script>
	import "../../../../app.postcss";
	import "../../../../kener.css";
	import "../../../../manage.css";
	import { setMode, mode, ModeWatcher } from "mode-watcher";

  export let data;
  const basePath = data.basePath;
	setMode("dark");
</script>

<ModeWatcher />
<svelte:head>
	<meta name="description" content="Set up Kener" />
	<meta name="robots" content="noindex" />
	<link rel="icon" href="{basePath}/logo96.png" />
</svelte:head>

<main class="setup">
	<!-- ========== HEADER ========== -->

	<!-- ========== END HEADER ========== -->
	<slot></slot>
</main>
