<script>
	import * as Card from "$lib/components/ui/card";
	import { Button } from "$lib/components/ui/button";
	import { Input } from "$lib/components/ui/input";
	import { Label } from "$lib/components/ui/label";
	import { siteDataExtractFromDb, storeSiteData } from "$lib/clientTools.js";
	import { base } from "$app/paths";
	import { Loader, Info, Check, FileWarning } from "lucide-svelte";
	import { Tooltip } from "bits-ui";
	import * as Alert from "$lib/components/ui/alert";

	export let data;

	let githubInfo = {
		repo: "",
		owner: "",
		incidentSince: "",
		apiURL: "https://api.github.com"
	};

	githubInfo = siteDataExtractFromDb(data.siteData, { github: githubInfo }).github;

	let formState = "idle";
	async function formSubmit() {
		formState = "loading";
		let resp = await storeSiteData({
			github: JSON.stringify(githubInfo)
		});
		//print data
		let data = await resp.json();
		formState = "idle";
		if (data.error) {
			alert(data.error);
			return;
		}
	}
</script>

<Card.Root class="mt-4">
	<Card.Header class="border-b">
		<Card.Title>Github Repo Information</Card.Title>
		<Card.Description>Set up a Github repository to store incident management.</Card.Description
		>
	</Card.Header>
	<Card.Content>
		{#if !!data.GH_TOKEN}
			<Alert.Root class="mt-4">
				<Check class="h-4 w-4" />
				<Alert.Title>GH_TOKEN is Set</Alert.Title>
				<Alert.Description>
					<span class="text-green-500">{data.GH_TOKEN}</span> is set in your environment variables.
				</Alert.Description>
			</Alert.Root>
		{:else}
			<Alert.Root class="mt-4" variant="destructive">
				<FileWarning class="h-4 w-4" />
				<Alert.Title>GH_TOKEN not found.</Alert.Title>
				<Alert.Description>
					Please add GH_TOKEN in your environment variables. Visit <a
						href="https://kener.ing/docs/gh-setup/"
						class="text-blue-500"
						target="_blank">here</a
					> for more information.
				</Alert.Description>
			</Alert.Root>
		{/if}
		<form class="mx-auto mt-4 space-y-4" on:submit|preventDefault={formSubmit}>
			<div class="flex w-full flex-row justify-evenly gap-2">
				<div class="w-full">
					<Label for="apiURL">
						Github API URL
						<span class="text-red-500">*</span>
						<Tooltip.Root openDelay={100}>
							<Tooltip.Trigger class="">
								<Info class="inline-block h-4 w-4 text-muted-foreground" />
							</Tooltip.Trigger>
							<Tooltip.Content>
								<div
									class=" flex items-center justify-center rounded border bg-gray-800 p-1.5 text-xs font-medium text-gray-300 shadow-popover outline-none"
								>
									Change this only if you are using a custom Github API URL.
								</div>
							</Tooltip.Content>
						</Tooltip.Root>
					</Label>
					<Input
						bind:value={githubInfo.apiURL}
						class="mt-2"
						type="text"
						id="apiURL"
						placeholder="eg. https://api.github.com"
						required
					/>
				</div>
			</div>
			<div class="flex w-full flex-row justify-evenly gap-2">
				<div class="w-full">
					<Label for="repo">
						Github Repo
						<span class="text-red-500">*</span>
						<Tooltip.Root openDelay={100}>
							<Tooltip.Trigger class="">
								<Info class="inline-block h-4 w-4 text-muted-foreground" />
							</Tooltip.Trigger>
							<Tooltip.Content>
								<div
									class=" flex items-center justify-center rounded border bg-gray-800 p-1.5 text-xs font-medium text-gray-300 shadow-popover outline-none"
								>
									Repo name where incidents will be stored. More often then not it
									is the same where kener is forked.
								</div>
							</Tooltip.Content>
						</Tooltip.Root>
					</Label>
					<Input
						bind:value={githubInfo.repo}
						class="mt-2"
						type="text"
						id="repo"
						placeholder="eg. kener"
						required
					/>
				</div>
				<div class="w-full">
					<Label for="owner">
						Github Username
						<span class="text-red-500">*</span>
						<Tooltip.Root openDelay={100}>
							<Tooltip.Trigger class="">
								<Info class="inline-block h-4 w-4 text-muted-foreground" />
							</Tooltip.Trigger>
							<Tooltip.Content>
								<div
									class=" flex items-center justify-center rounded border bg-gray-800 p-1.5 text-xs font-medium text-gray-300 shadow-popover outline-none"
								>
									Owner of the repo. More often then not it is the same where
									kener is forked.
								</div>
							</Tooltip.Content>
						</Tooltip.Root>
					</Label>
					<Input
						bind:value={githubInfo.owner}
						class="mt-2"
						type="text"
						id="owner"
						placeholder="eg. rajnandan1"
						required
					/>
				</div>
				<div class="w-full">
					<Label for="incidentSince">
						Incident History
						<span class="text-red-500">*</span>

						<Tooltip.Root openDelay={100}>
							<Tooltip.Trigger class="">
								<Info class="inline-block h-4 w-4 text-muted-foreground" />
							</Tooltip.Trigger>
							<Tooltip.Content>
								<div
									class=" flex items-center justify-center rounded border bg-gray-800 px-2 py-1.5 text-xs font-medium text-gray-300 shadow-popover outline-none"
								>
									It is in hours. <br />It means if an issue is created before X
									hours then kener would <br />not honor it. It would not show
									then incident<br /> in active incident pages nor it will update<br
									/> the uptime.
								</div>
							</Tooltip.Content>
						</Tooltip.Root>
					</Label>
					<Input
						bind:value={githubInfo.incidentSince}
						class="mt-2"
						type="number"
						min="1"
						id="incidentSince"
						placeholder="eg. 24"
						required
					/>
				</div>
			</div>

			<div class="flex w-full justify-end">
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
