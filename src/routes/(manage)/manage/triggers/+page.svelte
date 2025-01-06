<script>
	import TriggerInfo from "$lib/components/manage/triggerInfo.svelte";
	import { onMount } from "svelte";

	export let data;
</script>

<div class="min-h-[70vh]">
	<TriggerInfo {data} />
</div>
