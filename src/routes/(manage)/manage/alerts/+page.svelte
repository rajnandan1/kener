<script>
	import AlertsInfo from "$lib/components/manage/alertsInfo.svelte";
	import { onMount } from "svelte";

	export let data;
</script>

<div class="min-h-[70vh]">
	<AlertsInfo {data} />
</div>
