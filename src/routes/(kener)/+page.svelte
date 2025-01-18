<script>
	import Monitor from "$lib/components/monitor.svelte";
	import * as Card from "$lib/components/ui/card";
	import { Button, buttonVariants } from "$lib/components/ui/button";
	import Incident from "$lib/components/IncidentNew.svelte";
	import { Badge } from "$lib/components/ui/badge";
	import { l } from "$lib/i18n/client";
	import { base } from "$app/paths";
	import { ArrowRight, ChevronLeft, X } from "lucide-svelte";
	import { hotKeyAction, clickOutsideAction } from "svelte-legos";
	import { onMount } from "svelte";
	import ShareMenu from "$lib/components/shareMenu.svelte";
	import { scale } from "svelte/transition";

	export let data;
	let shareMenusToggle = false;
	function showShareMenu(e) {
		shareMenusToggle = true;
		activeMonitor = e.detail.monitor;
	}
	let activeMonitor = null;
	let pageLoaded = false;
	$: {
		if (pageLoaded) {
			if (shareMenusToggle) {
				document.body.style.overflow = "hidden";
			} else {
				document.body.style.overflow = "auto";
			}
		}
	}

	let isHome = !data.isCategoryPage && !data.isMonitorPage;

	if (data.isCategoryPage) {
		let category = data.site.categories.find((e) => e.name == data.categoryName);
		data.site.hero.title = category.name;
		data.site.hero.subtitle = category.description;
	}

	onMount(() => {
		pageLoaded = true;
	});
</script>

<div class="mt-12"></div>
{#if data.site.hero && !data.isMonitorPage}
	<section
		class="mx-auto mb-8 flex w-full max-w-[655px] flex-1 flex-col items-start justify-center"
	>
		<div class="mx-auto max-w-screen-xl px-4 lg:flex lg:items-center">
			<div class="blurry-bg mx-auto max-w-3xl text-center">
				{#if data.site.hero.image}
					<img src={data.site.hero.image} class="m-auto h-16 w-16" alt="" srcset="" />
				{/if}
				{#if data.site.hero.title}
					<h1
						class="bg-gradient-to-r from-green-300 via-blue-500 to-purple-600 bg-clip-text text-5xl font-extrabold leading-tight text-transparent"
					>
						{data.site.hero.title}
					</h1>
				{/if}
				{#if data.site.hero.subtitle}
					<p class="mx-auto mt-4 max-w-xl sm:text-xl">{data.site.hero.subtitle}</p>
				{/if}
			</div>
		</div>
	</section>
{/if}
{#if !isHome}
	<section
		class="mx-auto my-2 flex w-full max-w-[655px] flex-1 flex-col items-start justify-center"
	>
		<Button
			variant="outline"
			class="bounce-left h-8   justify-start  pl-1.5"
			on:click={() => {
				if (data.isCategoryPage) {
					return window.history.back();
				}
				if (data.isMonitorPage) {
					return (window.location.href = `${base}/`);
				}
			}}
		>
			<ChevronLeft class="arrow mr-1 h-5 w-5" />
			{l(data.lang, "Back")}
		</Button>
	</section>
{/if}
{#if data.unresolvedIncidents.length > 0}
	<section
		class="mx-auto mb-2 flex w-full max-w-[655px] flex-1 flex-col items-start justify-center bg-transparent"
		id=""
	>
		<div class="grid w-full grid-cols-2 gap-4">
			<div class="col-span-2 text-center md:col-span-1 md:text-left">
				<Badge variant="outline" class="border-0 pl-0">
					{l(data.lang, "Ongoing Incidents")}
				</Badge>
			</div>
		</div>
	</section>
	<section
		class="mx-auto mb-8 flex w-full max-w-[655px] flex-1 flex-col items-start justify-center backdrop-blur-[2px]"
		id=""
	>
		<Card.Root class="w-full">
			<Card.Content class=" newincidents w-full overflow-hidden p-0">
				{#each data.unresolvedIncidents as incident, index}
					<Incident
						{incident}
						lang={data.lang}
						index="incident-{index}"
						selectedLang={data.selectedLang}
					/>
				{/each}
			</Card.Content>
		</Card.Root>
	</section>
{/if}
{#if data.monitors.length > 0}
	<section
		class="mx-auto mb-2 flex w-full flex-1 flex-col items-start justify-center bg-transparent md:w-[655px]"
		id=""
	>
		<div class="grid w-full grid-cols-2 gap-4">
			<div class="col-span-2 text-center md:col-span-1 md:text-left">
				<Badge class="border-0 md:pl-0" variant="outline">
					{l(data.lang, "Availability per Component")}
				</Badge>
			</div>
			<div class="col-span-2 text-center md:col-span-1 md:text-right">
				<Badge variant="outline" class="border-0 md:pr-0">
					<span class="bg-api-up mr-1 inline-flex h-[8px] w-[8px] rounded-full opacity-75"
					></span>
					<span class="mr-3">
						{l(data.lang, "UP")}
					</span>

					<span
						class="bg-api-degraded mr-1 inline-flex h-[8px] w-[8px] rounded-full opacity-75"
					></span>
					<span class="mr-3">
						{l(data.lang, "DEGRADED")}
					</span>

					<span
						class="bg-api-down mr-1 inline-flex h-[8px] w-[8px] rounded-full opacity-75"
					></span>
					<span class="">
						{l(data.lang, "DOWN")}
					</span>
				</Badge>
			</div>
		</div>
	</section>
	<section
		class="z-20 mx-auto mb-8 flex w-full flex-1 flex-col items-start justify-center backdrop-blur-[2px] md:w-[655px]"
	>
		<Card.Root>
			<Card.Content class="monitors-card  p-0">
				{#each data.monitors as monitor}
					<Monitor
						on:show_shareMenu={showShareMenu}
						{monitor}
						localTz={data.localTz}
						lang={data.lang}
						selectedLang={data.selectedLang}
					/>
				{/each}
			</Card.Content>
		</Card.Root>
	</section>
{/if}
{#if data.site.categories && isHome}
	<section
		class="relative z-10 mx-auto mb-8 w-full max-w-[890px] flex-1 flex-col items-start backdrop-blur-[2px] md:w-[655px]"
	>
		{#each data.site.categories.filter((e) => e.name != "Home") as category}
			<div
				on:click={() => {
					window.location.href = `?category=${category.name}`;
				}}
			>
				<Card.Root class="hover:bg-secondary">
					<Card.Header class="bounce-right relative w-full cursor-pointer px-4  ">
						<Card.Title class="w-full ">
							{category.name}
							<Button
								variant="ghost"
								class="arrow absolute right-4 top-9 h-5 w-5 p-0 text-muted-foreground"
								size="icon"
							>
								<ArrowRight class="h-4 w-4" />
							</Button>
						</Card.Title>
						<Card.Description>
							{#if category.description}
								{@html category.description}
							{/if}
						</Card.Description>
					</Card.Header>
				</Card.Root>
			</div>
		{/each}
	</section>
{/if}
<section
	class="mx-auto mb-2 flex w-full max-w-[655px] flex-1 flex-col items-start justify-center bg-transparent"
	id=""
>
	<div
		on:click={() => {
			window.location.href = `${base}/incidents`;
		}}
		class="bounce-right grid w-full cursor-pointer grid-cols-2 justify-between gap-4 rounded-md border bg-card px-4 py-2 text-sm font-medium hover:bg-secondary"
	>
		<div class="col-span-1 text-left">
			{l(data.lang, "Recent Incidents")}
		</div>
		<div class="text-right">
			<span class="arrow float-right mt-0.5">
				<ArrowRight class="h-4 w-4 text-muted-foreground hover:text-primary" />
			</span>
		</div>
	</div>
</section>
{#if shareMenusToggle}
	<div
		transition:scale={{ duration: 100 }}
		use:hotKeyAction={{
			code: "Escape",
			cb: () => (shareMenusToggle = false)
		}}
		class="moldal-container fixed left-0 top-0 z-30 h-screen w-full bg-card bg-opacity-30 backdrop-blur-sm"
	>
		<div
			use:clickOutsideAction
			on:clickoutside={() => {
				shareMenusToggle = false;
			}}
			class="absolute left-1/2 top-1/2 h-fit w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-md border bg-background shadow-lg backdrop-blur-lg md:w-[568px]"
		>
			<Button
				variant="ghost"
				on:click={() => {
					shareMenusToggle = false;
				}}
				class="absolute right-2 top-2 z-40 h-6 w-6   rounded-full border bg-background p-1"
			>
				<X class="h-4 w-4   text-muted-foreground" />
			</Button>
			<div class="content">
				<ShareMenu
					monitor={activeMonitor}
					lang={data.lang}
					selectedLang={data.selectedLang}
				/>
			</div>
		</div>
	</div>
{/if}
