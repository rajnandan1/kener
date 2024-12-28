<script>
	import * as Card from "$lib/components/ui/card";
	import { Button } from "$lib/components/ui/button";
	import { Input } from "$lib/components/ui/input";
	import { Label } from "$lib/components/ui/label";
	import { Plus, X } from "lucide-svelte";
	import autoAnimate from "@formkit/auto-animate";
	import { siteDataExtractFromDb, storeSiteData } from "$lib/clientTools.js";
	import { base } from "$app/paths";
	import { Loader, Info } from "lucide-svelte";
	import { Tooltip } from "bits-ui";

	export let data;

	let metaTags = [];
	function addNewRow() {
		metaTags = [
			...metaTags,
			{
				key: "",
				value: ""
			}
		];
	}
	let analyticsSupported = [
		{
			id: "",
			type: "GA",
			name: "Google Analytics",
			script: "https://unpkg.com/@analytics/google-analytics@1.0.7/dist/@analytics/google-analytics.min.js"
		},
		{
			id: "",
			type: "AMPLITUDE",
			name: "Amplitude",
			script: "https://unpkg.com/@analytics/amplitude@0.1.3/dist/@analytics/amplitude.min.js"
		},
		{
			id: "",
			type: "MIXPANEL",
			name: "MixPanel",
			script: "https://unpkg.com/@analytics/mixpanel@0.4.0/dist/@analytics/mixpanel.min.js"
		}
	];
	function removeRow(i) {
		metaTags = metaTags.filter((_, index) => index !== i);
	}

	metaTags = siteDataExtractFromDb(data.siteData, {
		metaTags: JSON.stringify(metaTags)
	}).metaTags;

	let analytics = siteDataExtractFromDb(data.siteData, {
		analytics: "[]"
	}).analytics;

	//merge analyticsSupported with analytics
	analytics = analyticsSupported.map((supported) => {
		let found = analytics.find((a) => a.type === supported.type);
		if (found) {
			return found;
		}
		return supported;
	});

	let formState = "idle";
	let formStateAnalytics = "idle";
	async function formSubmit() {
		formState = "loading";
		let resp = await storeSiteData({
			metaTags: JSON.stringify(metaTags)
		});
		//print data
		let data = await resp.json();
		formState = "idle";
		if (data.error) {
			alert(data.error);
			return;
		}
	}

	async function formSubmitAnalytics() {
		formStateAnalytics = "loading";
		let resp = await storeSiteData({
			analytics: JSON.stringify(analytics)
		});
		//print data
		let data = await resp.json();
		formStateAnalytics = "idle";
		if (data.error) {
			alert(data.error);
			return;
		}
	}
</script>

<Card.Root class="mt-4">
	<Card.Header class="border-b">
		<Card.Title>Analytics</Card.Title>
		<Card.Description>Deploy your new project in one-click.</Card.Description>
	</Card.Header>
	<Card.Content>
		<form class="mx-auto mt-4 space-y-4" on:submit|preventDefault={formSubmitAnalytics}>
			<div class="grid grid-cols-2 gap-2">
				{#each analytics as analytic}
					<div class="col-span-1">
						<Label for={analytic.type}>
							{analytic.name}
							<Tooltip.Root openDelay={100}>
								<Tooltip.Trigger class="">
									<Info class="inline-block h-4 w-4 text-muted-foreground" />
								</Tooltip.Trigger>
								<Tooltip.Content>
									<div
										class=" flex items-center justify-center rounded border bg-gray-800 p-1.5 text-xs font-medium text-gray-300 shadow-popover outline-none"
									>
										Add your {analytic.name} ID/Key here.
									</div>
								</Tooltip.Content>
							</Tooltip.Root>
						</Label>
						<Input
							bind:value={analytic.id}
							class="mt-2"
							type="text"
							id={analytic.type}
							placeholder="{analytic.type} ID/Key"
						/>
					</div>
				{/each}
			</div>

			<div class="flex w-full justify-end">
				<Button type="submit" disabled={formStateAnalytics === "loading"}>
					Save
					{#if formStateAnalytics === "loading"}
						<Loader class="ml-2 inline h-4 w-4 animate-spin" />
					{/if}
				</Button>
			</div>
		</form>
	</Card.Content>
</Card.Root>
<Card.Root class="mt-4">
	<Card.Header class="border-b">
		<Card.Title>Search Engine Optimization</Card.Title>
		<Card.Description>Deploy your new project in one-click.</Card.Description>
	</Card.Header>
	<Card.Content>
		<form class="mx-auto mt-4 space-y-4" use:autoAnimate on:submit|preventDefault={formSubmit}>
			{#each metaTags as metaTag, i}
				<div class="flex w-full flex-row justify-between gap-2">
					<div class="grid grid-cols-12 gap-x-2">
						<div class="col-span-4">
							<Label for="key">
								Meta Name
								<Tooltip.Root openDelay={100}>
									<Tooltip.Trigger class="">
										<Info class="inline-block h-4 w-4 text-muted-foreground" />
									</Tooltip.Trigger>
									<Tooltip.Content class="max-w-md">
										<div
											class=" flex items-center justify-center rounded border bg-gray-800 px-2 py-1.5 text-xs font-medium text-gray-300 shadow-popover outline-none"
										>
											&#x3C;meta name=&#x22;{metaTag.key}&#x22; content=&#x22;{metaTag.value}&#x22;&#x3E;
										</div>
									</Tooltip.Content>
								</Tooltip.Root>
							</Label>
							<Input
								bind:value={metaTag.key}
								class="mt-2"
								type="text"
								id="key"
								placeholder="eg. kener"
							/>
						</div>
						<div class="col-span-7">
							<Label for="value">Content</Label>
							<Input
								bind:value={metaTag.value}
								class="mt-2"
								type="text"
								id="value"
								placeholder="eg. kener"
							/>
						</div>
						<div class="col-span-1">
							<Button variant="ghost" class="mt-8" on:click={() => removeRow(i)}>
								<X class="h-4 w-4" />
							</Button>
						</div>
					</div>
				</div>
			{/each}
			<div class="relative">
				<hr class="border-1 border-border-input relative top-4 h-px border-dashed" />

				<Button
					on:click={addNewRow}
					variant="secondary"
					class="absolute left-1/2 h-8 w-8 -translate-x-1/2 p-0  "
				>
					<Plus class="h-4 w-4 " />
				</Button>
			</div>
			<div class="flex w-full justify-end" style="margin-top:32px">
				<Button type="submit" disabled={formState === "loading"}>
					Save
					{#if formState === "loading"}
						<Loader class="ml-2 inline h-4 w-4 animate-spin" />
					{/if}
				</Button>
			</div>
		</form>
	</Card.Content>
</Card.Root>
