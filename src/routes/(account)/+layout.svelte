<script>
	import "../../app.postcss";
	import "../../kener.css";
	import "../../manage.css";
	import { setMode, mode, ModeWatcher } from "mode-watcher";
	setMode("dark");
</script>

<ModeWatcher />
<svelte:head>
	<title>Setup Kener</title>
	<meta name="description" content="Set up Kener" />
</svelte:head>

<main class="setup">
	<!-- ========== HEADER ========== -->

	<!-- ========== END HEADER ========== -->
	<slot></slot>
</main>
