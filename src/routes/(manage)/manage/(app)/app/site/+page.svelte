<script>
	import SiteInfo from "$lib/components/manage/siteInfo.svelte";
	import { onMount } from "svelte";

	export let data;
</script>

<div class="min-h-[70vh]">
	<SiteInfo {data} />
</div>
