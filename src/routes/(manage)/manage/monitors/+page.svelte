<script>
	import MonitorsAdd from "$lib/components/manage/monitorsAdd.svelte";
	import { onMount } from "svelte";

	export let data;
</script>

<div class="min-h-[70vh]">
	<MonitorsAdd
		categories={data.siteData?.categories}
		colorDown={data.siteData?.colors.DOWN}
		colorDegraded={data.siteData?.colors.DEGRADED}
	/>
</div>
