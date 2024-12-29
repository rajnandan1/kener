<script>
	import { enhance } from "$app/forms";
	import * as Card from "$lib/components/ui/card";
	import { Button } from "$lib/components/ui/button";
	import { Input } from "$lib/components/ui/input";
	import { Label } from "$lib/components/ui/label";
	import SiteInfo from "$lib/components/manage/siteInfo.svelte";
	import GithubInfo from "$lib/components/manage/githubInfo.svelte";
	import SeoInfo from "$lib/components/manage/seoInfo.svelte";
	import HomePage from "$lib/components/manage/homePage.svelte";
	import ThemeInfo from "$lib/components/manage/themeInfo.svelte";
	import MonitorsAdd from "$lib/components/manage/monitorsAdd.svelte";
	import TriggerInfo from "$lib/components/manage/triggerInfo.svelte";
	import AlertsInfo from "$lib/components/manage/alertsInfo.svelte";
	import APIKeys from "$lib/components/manage/apiKeys.svelte";
	import { Tabs } from "bits-ui";
	import { Plane } from "lucide-svelte";
	import { onMount } from "svelte";

	export let data;

	let activeTab = "SiteInfo";

	function tabChange(e) {
		location.href = `#${e}`;
	}

	onMount(() => {
		const hash = location.hash;
		if (hash) {
			const tab = hash.replace("#", "");
			activeTab = tab;
		}
	});
</script>

<div class="pt-8">
	<Tabs.Root value={activeTab} class="" onValueChange={tabChange}>
		<Tabs.List class="tabs flex justify-between gap-x-6">
			<Tabs.Trigger
				value="SiteInfo"
				class="border-b-2 border-transparent px-2 pb-1 text-sm font-medium"
			>
				Site
			</Tabs.Trigger>
			<Tabs.Trigger
				value="GithubInfo"
				class=" border-b-2 border-transparent px-2 pb-1 text-sm font-medium"
			>
				Github
			</Tabs.Trigger>
			<Tabs.Trigger
				value="SeoInfo"
				class="border-b-2 border-transparent px-2 pb-1 text-sm text-sm font-medium"
			>
				SEO
			</Tabs.Trigger>
			<Tabs.Trigger
				value="HomePage"
				class="border-b-2 border-transparent px-2 pb-1 text-sm font-medium"
			>
				Home Page
			</Tabs.Trigger>
			<Tabs.Trigger
				value="ThemeInfo"
				class="border-b-2 border-transparent px-2 pb-1 text-sm font-medium"
			>
				Theme
			</Tabs.Trigger>
			<Tabs.Trigger
				value="MonitorsAdd"
				class="border-b-2 border-transparent px-2 pb-1 text-sm font-medium"
			>
				Monitors
			</Tabs.Trigger>
			<Tabs.Trigger
				value="TriggerInfo"
				class="border-b-2 border-transparent px-2  pb-1 text-sm font-medium"
			>
				Triggers
			</Tabs.Trigger>
			<Tabs.Trigger
				value="AlertsInfo"
				class="border-b-2 border-transparent px-2 pb-1 text-sm font-medium"
			>
				Alerts
			</Tabs.Trigger>
			<Tabs.Trigger
				value="APIKeys"
				class="border-b-2 border-transparent px-2 pb-1 text-sm font-medium"
			>
				API Keys
			</Tabs.Trigger>
		</Tabs.List>
		<Tabs.Content value="SiteInfo" class="min-h-[70vh] pt-3">
			<SiteInfo {data} />
		</Tabs.Content>
		<Tabs.Content value="GithubInfo" class=" min-h-[70vh] pt-3">
			<GithubInfo {data} />
		</Tabs.Content>
		<Tabs.Content value="SeoInfo" class="min-h-[70vh] pt-3">
			<SeoInfo {data} />
		</Tabs.Content>
		<Tabs.Content value="HomePage" class="min-h-[70vh] pt-3">
			<HomePage {data} />
		</Tabs.Content>
		<Tabs.Content value="ThemeInfo" class="min-h-[70vh] pt-3">
			<ThemeInfo {data} />
		</Tabs.Content>
		<Tabs.Content value="MonitorsAdd" class="min-h-[70vh] pt-3">
			<MonitorsAdd
				categories={data.siteData?.categories}
				colorDown={data.siteData?.colors.DOWN}
				colorDegraded={data.siteData?.colors.DEGRADED}
			/>
		</Tabs.Content>
		<Tabs.Content value="TriggerInfo" class="min-h-[70vh] pt-3">
			<TriggerInfo {data} />
		</Tabs.Content>
		<Tabs.Content value="AlertsInfo" class="min-h-[70vh] pt-3">
			<AlertsInfo {data} />
		</Tabs.Content>
		<Tabs.Content value="APIKeys" class="min-h-[70vh] pt-3">
			<APIKeys />
		</Tabs.Content>
	</Tabs.Root>
</div>
