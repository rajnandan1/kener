<script>
	import Incident from "$lib/components/incident.svelte";
	import { Separator } from "$lib/components/ui/separator";
	import { Badge } from "$lib/components/ui/badge";
	import { l, summaryTime } from "$lib/i18n/client";

	export let data;
</script>

<svelte:head>
	<title>
		{data.monitor.name} - {l(data.lang, "root.incidents")}
	</title>
</svelte:head>
<section class="mx-auto flex w-full max-w-4xl flex-1 flex-col items-start justify-center">
	<div class="mx-auto max-w-screen-xl px-4 pb-16 pt-32 lg:flex lg:items-center">
		<div class="blurry-bg mx-auto max-w-3xl text-center">
			<h1
				class="bg-gradient-to-r from-green-300 via-blue-500 to-purple-600 bg-clip-text text-5xl font-extrabold leading-snug text-transparent"
			>
				{data.monitor.name}
			</h1>

			<p class="mx-auto mt-4 max-w-xl sm:text-xl">
				{@html data.monitor.description}
			</p>
		</div>
	</div>
</section>
<section class="mx-auto mb-4 mt-8 flex w-full flex-1 flex-col">
	<div class="container">
		<h1 class="mb-4 text-2xl font-bold leading-none">
			<Badge variant="outline">
				{l(data.lang, "root.active_incidents")}
			</Badge>
		</h1>

		{#if data.activeIncidents.length > 0}
			{#each data.activeIncidents as incident, i}
				<Incident
					{incident}
					state={i == 0 ? "open" : "close"}
					variant="title+body+comments"
					monitor={data.monitor}
					lang={data.lang}
				/>
			{/each}
		{:else}
			<div class="justify-left flex items-center">
				<p class="text-base font-semibold">
					{l(data.lang, "root.no_active_incident")}
				</p>
			</div>
		{/if}
	</div>
</section>

<Separator class="container mb-4 w-[400px]" />

<section class="mx-auto mb-4 mt-8 flex w-full flex-1 flex-col">
	<div class="container">
		<h1 class="mb-4 text-2xl font-bold leading-none">
			<Badge variant="outline">
				{l(data.lang, "root.recent_incidents")} - {summaryTime(
					data.lang,
					`Last ${data.site.github.incidentSince} hours`
				)}
			</Badge>
		</h1>

		{#if data.pastIncidents.length > 0}
			{#each data.pastIncidents as incident}
				<Incident
					{incident}
					state="close"
					variant="title+body+comments"
					monitor={data.monitor}
					lang={data.lang}
				/>
			{/each}
		{:else}
			<div class="justify-left flex items-center">
				<p class="text-base font-semibold">
					{l(data.lang, "root.no_recent_incident")}
				</p>
			</div>
		{/if}
	</div>
</section>
