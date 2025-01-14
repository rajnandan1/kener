<script>
	import * as Card from "$lib/components/ui/card";
	import { Button } from "$lib/components/ui/button";
	import { Input } from "$lib/components/ui/input";
	import { Label } from "$lib/components/ui/label";
	import { siteDataExtractFromDb, storeSiteData } from "$lib/clientTools.js";
	import { tooltipAction } from "svelte-legos";
	import { base } from "$app/paths";
	import { Loader, Info, X } from "lucide-svelte";
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

	let logoFile;

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

	// function handleFileChangeLogo(event) {
	// 	const file = event.target.files[0];
	// 	if (file) {
	// 		const reader = new FileReader();
	// 		reader.onload = () => {
	// 			siteInformation.logo = reader.result;
	// 		};
	// 		reader.readAsDataURL(file);
	// 	}
	// }
	function handleFileChangeFavicon(event) {
		const file = event.target.files[0];
		if (file) {
			const reader = new FileReader();
			reader.onload = () => {
				siteInformation.favicon = reader.result;
				uploadFunction(reader.result);
			};
			reader.readAsDataURL(file);
		}
	}
	let uploadLogoStatus = "";
	let uploadingLogo = false;
	async function handleFileChangeLogo(event) {
		event.preventDefault();

		uploadLogoStatus = "";
		const file = event.target.files[0];
		if (!file) {
			uploadLogoStatus = "Please select a file to upload.";
			return;
		}

		if (file.size > 100000) {
			uploadLogoStatus = "File size should be less than 100KB.";
			return;
		}

		const formData = new FormData();
		formData.append("image", file);
		uploadingLogo = true;
		try {
			const response = await fetch("/manage/app/upload", {
				method: "POST",
				body: formData
			});

			if (response.ok) {
				const result = await response.json();
				siteInformation.logo = base + "/uploads/" + result.filename;
			} else {
				uploadLogoStatus = "Failed to upload file.";
			}
		} catch (error) {
			uploadLogoStatus = "An error occurred while uploading the file.";
		} finally {
			uploadingLogo = false;
		}
	}

	let uploadFaviconStatus = "";
	let uploadingFavicon = false;
	async function handleFaviconChangeLogo(event) {
		event.preventDefault();

		uploadFaviconStatus = "";
		const file = event.target.files[0];
		if (!file) {
			uploadFaviconStatus = "Please select a file to upload.";
			return;
		}

		if (file.size > 20000) {
			uploadFaviconStatus = "File size should be less than 20KB.";
			return;
		}

		const formData = new FormData();
		formData.append("image", file);
		uploadingFavicon = true;
		try {
			const response = await fetch("/manage/app/upload", {
				method: "POST",
				body: formData
			});

			if (response.ok) {
				const result = await response.json();
				siteInformation.favicon = base + "/uploads/" + result.filename;
			} else {
				uploadFaviconStatus = "Failed to upload file.";
			}
		} catch (error) {
			uploadFaviconStatus = "An error occurred while uploading the file.";
		} finally {
			uploadingFavicon = false;
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
									class=" flex items-center justify-center rounded border bg-input p-1.5 text-xs font-medium text-gray-300 shadow-popover outline-none"
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
									class=" flex items-center justify-center rounded border bg-input p-1.5 text-xs font-medium text-gray-300 shadow-popover outline-none"
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
									class=" flex items-center justify-center rounded border bg-input p-1.5 text-xs font-medium text-gray-300 shadow-popover outline-none"
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
									class=" flex items-center justify-center rounded border bg-input p-1.5 text-xs font-medium text-gray-300 shadow-popover outline-none"
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

			<div class="flex w-full flex-col justify-evenly gap-2">
				<div>
					<Label for="logo">Logo</Label>
				</div>
				<div class="flex gap-x-2">
					{#if !!siteInformation.logo}
						<div class="relative">
							<Label
								for="logo"
								class="inline-block h-[60px] w-[60px] cursor-pointer rounded-sm border p-1"
							>
								<img
									src={siteInformation.logo}
									class="w-fit hover:scale-95"
									alt=""
								/>
							</Label>

							<div class="absolute -right-2 -top-2">
								<Button
									variant="secondary"
									class="h-5 w-5 rounded-full border p-1"
									size="icon"
									on:click={() => (siteInformation.logo = "")}
								>
									<X class="h-4 w-4" />
								</Button>
							</div>
							{#if uploadingLogo}
								<div
									class="absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 transform rounded-sm bg-[rgba(0,0,0,0.5)] p-0.5"
								>
									<Loader class="h-4 w-4 animate-spin" />
								</div>
							{/if}
						</div>
					{/if}
					<div>
						<Input
							class=""
							id="logo"
							type="file"
							accept=".jpg, .jpeg, .png"
							disabled={uploadingLogo}
							on:change={handleFileChangeLogo}
						/>
						<p class="mt-1 text-xs font-medium">
							Please upload a square image of max size 100KB
						</p>
						<p class="mt-1 text-xs font-medium text-destructive">
							{uploadLogoStatus}
						</p>
					</div>
				</div>
				<div>
					<Label for="favicon">Favicon</Label>
				</div>
				<div class="flex gap-x-2">
					{#if !!siteInformation.favicon}
						<div class="relative">
							<Label
								for="favicon"
								class="inline-block h-[40px] w-[40px] cursor-pointer rounded-sm border p-1"
							>
								<img
									src={siteInformation.favicon}
									class="w-fit hover:scale-95"
									alt=""
								/>
							</Label>

							<div class="absolute -right-2 -top-2">
								<Button
									variant="secondary"
									class="h-5 w-5 rounded-full border p-1"
									size="icon"
									on:click={() => (siteInformation.favicon = "")}
								>
									<X class="h-4 w-4" />
								</Button>
							</div>
							{#if uploadingFavicon}
								<div
									class="absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 transform rounded-sm bg-[rgba(0,0,0,0.5)] p-0.5"
								>
									<Loader class="h-4 w-4 animate-spin" />
								</div>
							{/if}
						</div>
					{/if}
					<div>
						<Input
							class=""
							id="logo"
							type="file"
							accept=".jpg, .jpeg, .png, .ico"
							disabled={uploadingFavicon}
							on:change={handleFaviconChangeLogo}
						/>
						<p class="mt-1 text-xs font-medium">
							Please upload a square image of max size 20KB
						</p>
						<p class="mt-1 text-xs font-medium text-destructive">
							{uploadFaviconStatus}
						</p>
					</div>
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
