<script>
	import ThemeInfo from "$lib/components/manage/themeInfo.svelte";
	import { onMount } from "svelte";

	export let data;
</script>

<div class="min-h-[70vh]">
	<ThemeInfo {data} />
</div>
