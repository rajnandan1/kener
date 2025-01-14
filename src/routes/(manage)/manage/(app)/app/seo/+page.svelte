<script>
	import SeoInfo from "$lib/components/manage/seoInfo.svelte";
	import { onMount } from "svelte";

	export let data;
</script>

<div class="min-h-[70vh]">
	<SeoInfo {data} />
</div>
