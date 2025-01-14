<script>
	import HomePage from "$lib/components/manage/homePage.svelte";
	import { onMount } from "svelte";

	export let data;
</script>

<div class="min-h-[70vh]">
	<HomePage {data} />
</div>
