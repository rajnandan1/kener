<script>
	import * as Card from "$lib/components/ui/card";
	import { Button } from "$lib/components/ui/button";
	import { Input } from "$lib/components/ui/input";
	import { Label } from "$lib/components/ui/label";
	import { siteDataExtractFromDb, storeSiteData } from "$lib/clientTools.js";
	import { tooltipAction } from "svelte-legos";
	import { base } from "$app/paths";
	import { Loader, Info } from "lucide-svelte";
	import { Tooltip } from "bits-ui";

	export let data;

	let siteInformation = {
		title: "",
		siteName: "",
		siteURL: "",
		home: "",
		logo: "",
		favicon: ""
	};

	let formErrorMessage = "";

	siteInformation = siteDataExtractFromDb(data.siteData, siteInformation);

	let formState = "idle";
	async function formSubmit() {
		formErrorMessage = "";
		formState = "loading";
		let resp = await storeSiteData(siteInformation);
		//print data
		let data = await resp.json();
		formState = "idle";
		if (data.error) {
			formErrorMessage = data.error;
			return;
		}
	}

	function handleFileChangeLogo(event) {
		const file = event.target.files[0];
		if (file) {
			const reader = new FileReader();
			reader.onload = () => {
				siteInformation.logo = reader.result;
			};
			reader.readAsDataURL(file);
		}
	}
	function handleFileChangeFavicon(event) {
		const file = event.target.files[0];
		if (file) {
			const reader = new FileReader();
			reader.onload = () => {
				siteInformation.favicon = reader.result;
			};
			reader.readAsDataURL(file);
		}
	}
</script>

<Card.Root class="mt-4">
	<Card.Header class="border-b">
		<Card.Title>Site Configuration</Card.Title>
		<Card.Description>Configure your site information here.</Card.Description>
	</Card.Header>
	<Card.Content>
		<form class="mx-auto mt-4 space-y-4" on:submit|preventDefault={formSubmit}>
			<div class="flex w-full flex-row justify-evenly gap-2">
				<div class="w-full">
					<Label for="title" class="">
						Site Title
						<span class="text-red-500">*</span>

						<Tooltip.Root openDelay={100}>
							<Tooltip.Trigger class="">
								<Info class="inline-block h-4 w-4 text-muted-foreground" />
							</Tooltip.Trigger>
							<Tooltip.Content>
								<div
									class=" flex items-center justify-center rounded border bg-gray-800 p-1.5 text-xs font-medium text-gray-300 shadow-popover outline-none"
								>
									Site Title will be the page title of your site.
									&lt;title&gt;&lt;/title&gt;
								</div>
							</Tooltip.Content>
						</Tooltip.Root>
					</Label>
					<Input
						bind:value={siteInformation.title}
						class="mt-2"
						type="text"
						id="title"
						placeholder="eg. kener"
						required
					/>
				</div>
				<div class="w-full">
					<Label for="siteName">
						Site Name
						<span class="text-red-500">*</span>

						<Tooltip.Root openDelay={100}>
							<Tooltip.Trigger class="">
								<Info class="inline-block h-4 w-4 text-muted-foreground" />
							</Tooltip.Trigger>
							<Tooltip.Content>
								<div
									class=" flex items-center justify-center rounded border bg-gray-800 p-1.5 text-xs font-medium text-gray-300 shadow-popover outline-none"
								>
									This is the name of your site.<br /> It will be shown in the nav
									bar as brand name.
								</div>
							</Tooltip.Content>
						</Tooltip.Root>
					</Label>
					<Input
						bind:value={siteInformation.siteName}
						class="mt-2"
						type="text"
						id="siteName"
						placeholder="eg. Kener.ing"
						required
					/>
				</div>
			</div>
			<div class="flex w-full flex-row justify-evenly gap-2">
				<div class="w-full">
					<Label for="siteURL">
						Site URL
						<span class="text-red-500">*</span>
						<Tooltip.Root openDelay={100}>
							<Tooltip.Trigger class="">
								<Info class="inline-block h-4 w-4 text-muted-foreground" />
							</Tooltip.Trigger>
							<Tooltip.Content>
								<div
									class=" flex items-center justify-center rounded border bg-gray-800 p-1.5 text-xs font-medium text-gray-300 shadow-popover outline-none"
								>
									The URL your kener is hosted on.
								</div>
							</Tooltip.Content>
						</Tooltip.Root>
					</Label>
					<Input
						bind:value={siteInformation.siteURL}
						class="mt-2"
						type="text"
						id="siteURL"
						placeholder="eg. https://status.example.com"
						required
					/>
				</div>
			</div>
			<div class="flex w-full flex-row justify-evenly gap-2">
				<div class="w-full">
					<Label for="siteURL">
						Home Location
						<span class="text-red-500">*</span>
						<Tooltip.Root openDelay={100}>
							<Tooltip.Trigger class="">
								<Info class="inline-block h-4 w-4 text-muted-foreground" />
							</Tooltip.Trigger>
							<Tooltip.Content>
								<div
									class=" flex items-center justify-center rounded border bg-gray-800 p-1.5 text-xs font-medium text-gray-300 shadow-popover outline-none"
								>
									Where to go when someone clicks on the brand logo in the navbar.
								</div>
							</Tooltip.Content>
						</Tooltip.Root>
					</Label>

					<Input
						bind:value={siteInformation.home}
						class="mt-2"
						type="text"
						id="home"
						placeholder="/ or https://example.com"
						required
					/>
				</div>
			</div>
			<div class="flex w-full flex-row justify-evenly gap-2">
				<div class="w-full">
					<Label for="logo">Site Logo</Label>
					{#if !!siteInformation.logo}
						<img
							src={siteInformation.logo}
							class="mt-2 h-[48px] w-[48px] rounded-sm border p-1"
							alt=""
						/>
					{/if}
					<Input
						class="mt-2"
						id="logo"
						type="file"
						accept=".jpg, .jpeg, .png"
						on:change={handleFileChangeLogo}
					/>
				</div>
				<div class="w-full">
					<Label for="favicon">Favicon</Label>
					{#if !!siteInformation.favicon}
						<img
							src={siteInformation.favicon}
							class="mt-2 h-[48px] w-[48px] rounded-sm border p-1"
							alt=""
						/>
					{/if}
					<Input
						class="mt-2"
						id="favicon"
						type="file"
						accept=".jpg, .jpeg, .png"
						on:change={handleFileChangeFavicon}
					/>
				</div>
			</div>
			<div class="flex w-full justify-end">
				<p class="px-4 pt-3 text-sm">
					<span class="text-red-500">
						{formErrorMessage}
					</span>
				</p>
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

<!-- GitHub Settings -->
