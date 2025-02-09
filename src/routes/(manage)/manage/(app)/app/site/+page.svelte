<script>
	import SiteInfo from "$lib/components/manage/siteInfo.svelte";
	import { onMount } from "svelte";
	import { Button } from "$lib/components/ui/button";
	import { ExternalLink } from "lucide-svelte";
	import { env } from '$env/dynamic/public';
	const isWhiteLabeled = env.PUBLIC_WHITE_LABEL === 'true';
	export let data;
</script>

<div class="min-h-[70vh]">
	<div class="flex justify-end">
		{#if !isWhiteLabeled}
			<Button variant="outline" href="https://kener.ing/docs/site" class=" text-sm">
				Documentation <ExternalLink size="12" class="ml-1" />
			</Button>
		{/if}
	</div>
	<SiteInfo {data} />
</div>
