<script>
	import Monitor from "$lib/components/monitor.svelte";
	import * as Card from "$lib/components/ui/card";
	import Incident from "$lib/components/incident.svelte";
	import { Separator } from "$lib/components/ui/separator";
	import { Badge } from "$lib/components/ui/badge";
	import { page } from "$app/stores";
	import { l } from "$lib/i18n/client";

	export let data;

	let category = data.site.categories.find((c) => c.name === $page.params.category);
	let hasActiveIncidents = data.openIncidents.length > 0;
</script>

<svelte:head>
	{#if category}
		<title>{category.name} {l(data.lang, "root.category")}</title>
		{#if category.description}
			<meta name="description" content={category.description} />
		{/if}
	{/if}
</svelte:head>
<div class="mt-32"></div>
{#if category}
	<section class="mx-auto mb-8 flex w-full max-w-4xl flex-1 flex-col items-start justify-center">
		<div class="mx-auto max-w-screen-xl px-4 lg:flex lg:items-center">
			<div class="blurry-bg mx-auto max-w-3xl text-center">
				{#if category.name}
					<h1
						class="bg-gradient-to-r from-green-300 via-blue-500 to-purple-600 bg-clip-text text-5xl font-extrabold leading-snug text-transparent"
					>
						{category.name}
					</h1>
				{/if}
				{#if category.description}
					<p class="mx-auto mt-4 max-w-xl sm:text-xl">{category.description}</p>
				{/if}
			</div>
		</div>
	</section>
{/if}
{#if hasActiveIncidents}
	<section
		class="mx-auto mb-4 flex w-full flex-1 flex-col items-start justify-center bg-transparent backdrop-blur-[2px] md:w-[655px]"
		id=""
	>
		<div class="grid w-full grid-cols-2 gap-4">
			<div class="col-span-2 text-center md:col-span-1 md:text-left">
				<Badge variant="outline">
					{l(data.lang, "root.ongoing_incidents")}
				</Badge>
			</div>
		</div>
	</section>
	<section
		class="mx-auto mb-8 flex w-full flex-1 flex-col items-start justify-center backdrop-blur-[2px] md:w-[655px]"
		id=""
	>
		{#each data.openIncidents as incident, i}
			<Incident
				{incident}
				state="close"
				variant="title+body+comments+monitor"
				monitor={incident.monitor}
				lang={data.lang}
			/>
		{/each}
	</section>
{/if}
{#if data.monitors.length > 0}
	<section
		class="mx-auto mb-2 flex w-full flex-1 flex-col items-start justify-center bg-transparent md:w-[655px]"
		id=""
	>
		<div class="grid w-full grid-cols-2 gap-4">
			<div class="col-span-2 text-center md:col-span-1 md:text-left">
				<Badge class="border-0 pl-0" variant="outline">
					{l(data.lang, "root.availability_per_component")}
				</Badge>
			</div>
			<div class="col-span-2 text-center md:col-span-1 md:text-right">
				<Badge variant="outline" class="border-0 pr-0">
					<span class="bg-api-up mr-1 inline-flex h-[8px] w-[8px] rounded-full opacity-75"
					></span>
					<span class="mr-3">
						{l(data.lang, "statuses.UP")}
					</span>

					<span
						class="bg-api-degraded mr-1 inline-flex h-[8px] w-[8px] rounded-full opacity-75"
					></span>
					<span class="mr-3">
						{l(data.lang, "statuses.DEGRADED")}
					</span>

					<span
						class="bg-api-down mr-1 inline-flex h-[8px] w-[8px] rounded-full opacity-75"
					></span>
					<span class="mr-3">
						{l(data.lang, "statuses.DOWN")}
					</span>
				</Badge>
			</div>
		</div>
	</section>
	<section
		class="mx-auto mb-8 flex w-full flex-1 flex-col items-start justify-center backdrop-blur-[2px] md:w-[655px]"
	>
		<Card.Root class="w-full">
			<Card.Content class="monitors-card p-0">
				{#each data.monitors as monitor}
					<Monitor {monitor} localTz={data.localTz} lang={data.lang} />
				{/each}
			</Card.Content>
		</Card.Root>
	</section>
{:else}
	<section
		class="mx-auto mb-4 flex w-full max-w-[890px] flex-1 flex-col items-start justify-center bg-transparent"
		id=""
	>
		<Card.Root class="mx-auto">
			<Card.Content class="pt-4">
				<h1
					class="scroll-m-20 text-center text-2xl font-extrabold tracking-tight lg:text-2xl"
				>
					{l(data.lang, "root.no_monitors")}
				</h1>
				<p class="mt-3 text-center">
					{l(data.lang, "root.read_doc_monitor")}
					<a
						href="https://kener.ing/docs#h1add-monitors"
						target="_blank"
						class="underline"
					>
						{l(data.lang, "root.here")}
					</a>
				</p>
			</Card.Content>
		</Card.Root>
	</section>
{/if}
