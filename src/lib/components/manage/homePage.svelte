<script>
	import * as Card from "$lib/components/ui/card";
	import { Button } from "$lib/components/ui/button";
	import { Input } from "$lib/components/ui/input";
	import { Label } from "$lib/components/ui/label";
	import { siteDataExtractFromDb, storeSiteData } from "$lib/clientTools.js";
	import { base } from "$app/paths";
	import * as Select from "$lib/components/ui/select";

	import { Loader, X, Plus, Info, Play } from "lucide-svelte";
	import { Tooltip } from "bits-ui";

	export let data;

	let formStateHero = "idle";
	let formStateNav = "idle";
	let formStateFooter = "idle";
	let formStatei18n = "idle";
	let formStateCategories = "idle";

	let githubInfo = {
		repo: "",
		owner: "",
		incidentSince: "",
		apiURL: "https://api.github.com"
	};
	let hero = {
		title: "",
		subtitle: ""
	};
	let footerHTML = "";
	let nav = [];
	let categories = [];
	let i18n = {
		defaultLocale: "en",
		locales: [
			{
				code: "en",
				name: "English",
				selected: true,
				disabled: false
			},
			{
				code: "hi",
				name: "हिन्दी",
				selected: true,
				disabled: false
			},
			{
				code: "zh_CN",
				name: "中文",
				selected: true,
				disabled: false
			},
			{
				code: "ja",
				name: "日本語",
				selected: true,
				disabled: false
			},
			{
				code: "vi",
				name: "Tiếng Việt",
				selected: true,
				disabled: false
			}
		]
	};

	if (data.siteData?.nav) {
		nav = data.siteData.nav;
	}
	if (data.siteData?.categories) {
		categories = data.siteData.categories;
	}
	if (data.siteData?.hero) {
		hero = data.siteData.hero;
	}

	if (data.siteData.footerHTML) {
		footerHTML = data.siteData.footerHTML;
	}
	if (data.siteData.i18n) {
		i18n = data.siteData.i18n;
	}

	async function formSubmitHero() {
		formStateHero = "loading";
		let resp = await storeSiteData({
			hero: JSON.stringify(hero)
		});
		//print data
		let data = await resp.json();
		formStateHero = "idle";
		if (data.error) {
			alert(data.error);
			return;
		}
	}

	let navErrorMessage = "";
	async function formSubmitNav() {
		navErrorMessage = "";
		formStateNav = "loading";
		let resp = await storeSiteData({
			nav: JSON.stringify(nav)
		});
		//print data
		let data = await resp.json();
		formStateNav = "idle";
		if (data.error) {
			navErrorMessage = data.error;
			return;
		}
	}
	async function formSubmitCategories() {
		formStateCategories = "loading";
		let resp = await storeSiteData({
			categories: JSON.stringify(categories)
		});
		//print data
		let data = await resp.json();
		formStateCategories = "idle";
		if (data.error) {
			alert(data.error);
			return;
		}
	}
	async function formSubmitFooter() {
		formStateFooter = "loading";
		let resp = await storeSiteData({
			footerHTML: footerHTML
		});
		//print data
		let data = await resp.json();
		formStateFooter = "idle";
		if (data.error) {
			alert(data.error);
			return;
		}
	}

	async function handleFileChangeLogo(event, i) {
		const file = event.target.files[0];

		if (!file) {
			alert("Please select a file to upload.");
			return;
		}

		if (file.size > 100000) {
			alert("File size should be less than 100KB");
			return;
		}

		nav[i].uploading = true;
		const formData = new FormData();
		formData.append("image", file);
		try {
			const response = await fetch("/manage/upload", {
				method: "POST",
				body: formData
			});

			if (response.ok) {
				const result = await response.json();
				nav[i].iconURL = base + "/uploads/" + result.filename;
			} else {
				alert("Failed to upload file.");
			}
		} catch (error) {
			alert("An error occurred while uploading the file.");
		} finally {
			nav[i].uploading = false;
		}
	}
	function addNewRow() {
		nav = [
			...nav,
			{
				name: "",
				url: "",
				iconURL: ""
			}
		];
	}
	function addNewCategory() {
		categories = [
			...categories,
			{
				name: "",
				description: ""
			}
		];
	}
	function removeRow(i) {
		nav = nav.filter((_, index) => index !== i);
	}

	function i18nChange(e) {
		i18n.defaultLocale = e.value;
	}

	async function formSubmiti18n() {
		formStatei18n = "loading";
		let resp = await storeSiteData({
			i18n: JSON.stringify(i18n)
		});
		//print data
		let data = await resp.json();
		formStatei18n = "idle";
		if (data.error) {
			alert(data.error);
			return;
		}
	}
</script>

<Card.Root class="mt-4">
	<Card.Header class="border-b">
		<Card.Title>Hero Section</Card.Title>
		<Card.Description>
			Configure the hero section of your site. This is the first section that appears on your
			site.
		</Card.Description>
	</Card.Header>
	<Card.Content>
		<form class="mx-auto mt-4 space-y-4" on:submit|preventDefault={formSubmitHero}>
			<div class="flex w-full flex-row justify-evenly gap-2">
				<div class="w-full">
					<Label for="hero_title">
						Title
						<Tooltip.Root openDelay={100}>
							<Tooltip.Trigger class="">
								<Info class="inline-block h-4 w-4 text-muted-foreground" />
							</Tooltip.Trigger>
							<Tooltip.Content class="max-w-md">
								<div
									class=" flex items-center justify-center rounded border bg-gray-800 px-2 py-1.5 text-xs font-medium text-gray-300 shadow-popover outline-none"
								>
									You can set the title of the hero section here. This will be
									displayed on the top of the page.
								</div>
							</Tooltip.Content>
						</Tooltip.Root>
					</Label>
					<Input
						bind:value={hero.title}
						class="mt-2"
						type="text"
						id="hero_title"
						placeholder="Status Page for Kener"
					/>
				</div>
			</div>
			<div class="flex w-full flex-row justify-evenly gap-2">
				<div class="w-full">
					<Label for="hero_subtitle">
						Subtitle
						<Tooltip.Root openDelay={100}>
							<Tooltip.Trigger class="">
								<Info class="inline-block h-4 w-4 text-muted-foreground" />
							</Tooltip.Trigger>
							<Tooltip.Content class="max-w-md">
								<div
									class=" flex items-center justify-center rounded border bg-gray-800 px-2 py-1.5 text-xs font-medium text-gray-300 shadow-popover outline-none"
								>
									You can set the subtitle of the hero section here. This will be
									displayed below the title.
								</div>
							</Tooltip.Content>
						</Tooltip.Root>
					</Label>
					<Input
						bind:value={hero.subtitle}
						class="mt-2"
						type="text"
						id="hero_subtitle"
						placeholder="Welcome to our status page"
					/>
				</div>
			</div>
			<div class="flex w-full justify-end">
				<Button type="submit" disabled={formStateHero === "loading"}>
					Save
					{#if formStateHero === "loading"}
						<Loader class="ml-2 inline h-4 w-4 animate-spin" />
					{/if}
				</Button>
			</div>
		</form>
	</Card.Content>
</Card.Root>

<Card.Root class="mt-4">
	<Card.Header class="border-b">
		<Card.Title>Navigation</Card.Title>
		<Card.Description>
			Configure the navigation of your site. This is the first section that appears on your
			site.
		</Card.Description>
	</Card.Header>
	<Card.Content>
		<form class="mx-auto mt-4 space-y-4" on:submit|preventDefault={formSubmitNav}>
			{#each nav as navItem, i}
				<div class="mb-8 flex w-full flex-row justify-evenly gap-2">
					<div class=" grid grid-cols-12 gap-x-2">
						<div class="relative col-span-3 {!!navItem.iconURL ? 'pl-12' : ''}">
							{#if !!navItem.iconURL}
								<div
									class="absolute left-0 top-5 mt-2 h-[30px] w-[30px] rounded-sm border p-1"
								>
									<img src={navItem.iconURL} class="" alt="" />
									<Button
										variant="secondary"
										class="absolute -right-2.5 -top-1.5 h-4 w-4 rounded-full p-0"
										on:click={() => (navItem.iconURL = "")}
									>
										<X class="h-3 w-3" />
									</Button>
								</div>
							{/if}
							<Label for="logo">Icon</Label>

							<Input
								class=""
								id="logo"
								disabled={!!navItem.uploading}
								type="file"
								accept=".jpg, .jpeg, .png"
								on:change={(e) => {
									handleFileChangeLogo(e, i);
								}}
							/>
						</div>
						<div class="col-span-3">
							<Label for="key">Title</Label>
							<Input
								bind:value={navItem.name}
								type="text"
								id="key"
								placeholder="Documentation"
							/>
						</div>
						<div class="col-span-5">
							<Label for="value">URL</Label>
							<Input
								bind:value={navItem.url}
								type="text"
								id="value"
								placeholder="/docs"
							/>
						</div>
						<div class="col-span-1">
							<Button variant="ghost" class="mt-6" on:click={() => removeRow(i)}>
								<X class="h-4 w-4" />
							</Button>
						</div>
					</div>
				</div>
				<hr />
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
				<p class="px-4 pt-1">
					<span class="text-xs text-red-500"> {navErrorMessage} </span>
				</p>
				<Button type="submit" disabled={formStateHero === "loading"}>
					Save
					{#if formStateHero === "loading"}
						<Loader class="ml-2 inline h-4 w-4 animate-spin" />
					{/if}
				</Button>
			</div>
		</form>
	</Card.Content>
</Card.Root>

<Card.Root class="mt-4">
	<Card.Header class="border-b">
		<Card.Title>Internationalization</Card.Title>
		<Card.Description>
			Configure the languages of your site. This is the first section that appears on your
			site.
		</Card.Description>
	</Card.Header>
	<Card.Content>
		<form class="mx-auto mt-4 space-y-4" on:submit|preventDefault={formSubmiti18n}>
			<p class="text-sm font-medium">All available languages</p>
			<div class="mb-8 flex w-full flex-row gap-x-4">
				{#each i18n.locales as locale}
					<div>
						<label>
							<input
								on:change={(e) => {
									locale.selected = e.target.checked;
								}}
								type="checkbox"
								checked={locale.selected}
								disabled={i18n.defaultLocale === locale.code}
							/>
							{locale.name}
						</label>
					</div>
				{/each}
			</div>
			<p class="text-sm font-medium">Select Default Language</p>
			<Select.Root portal={null} onSelectedChange={i18nChange}>
				<Select.Trigger class="w-[180px]">
					<Select.Value
						placeholder={i18n.locales.find((el) => el.code == i18n.defaultLocale).name}
					/>
				</Select.Trigger>
				<Select.Content>
					<Select.Group>
						<Select.Label>Languages</Select.Label>
						{#each i18n.locales as locale}
							<Select.Item
								value={locale.code}
								label={locale.name}
								disabled={!locale.selected}
								class="text-sm font-medium"
							>
								{locale.name}
							</Select.Item>
						{/each}
					</Select.Group>
				</Select.Content>
			</Select.Root>
			<div class="flex w-full justify-end">
				<Button type="submit" disabled={formStatei18n === "loading"}>
					Save
					{#if formStatei18n === "loading"}
						<Loader class="ml-2 inline h-4 w-4 animate-spin" />
					{/if}
				</Button>
			</div>
		</form>
	</Card.Content>
</Card.Root>

<Card.Root class="mt-4">
	<Card.Header class="border-b">
		<Card.Title>Site Categories</Card.Title>
		<Card.Description>
			Configure the categories of your site. This is the first section that appears on your
			site.
		</Card.Description>
	</Card.Header>
	<Card.Content>
		<form class="mx-auto mt-4 space-y-4" on:submit|preventDefault={formSubmitCategories}>
			{#each categories as cat, i}
				<div class="grid grid-cols-4 gap-2">
					<div class="col-span-1">
						<Label for="{i}catkey" class="block w-full">Name</Label>
						<Input
							bind:value={cat.name}
							class="mt-2"
							type="text"
							id="{i}catkey"
							placeholder="Category Name"
							disabled={i === 0}
						/>
					</div>
					<div class="relative col-span-3 pr-8">
						<Label for="{i}catdsc" class="block w-full">Description</Label>
						<Input
							bind:value={cat.description}
							class="mt-2"
							type="text"
							id="{i}catdsc"
							placeholder="Category Description"
							disabled={i === 0}
						/>
						<Button
							variant="ghost"
							class="absolute right-0 top-8 ml-2 h-6 w-6 p-1 "
							disabled={i === 0}
							on:click={() =>
								(categories = categories.filter((_, index) => index !== i))}
						>
							<X class="h-5 w-5" />
						</Button>
					</div>
				</div>
			{/each}
			<div class="relative pb-8">
				<hr class="border-1 border-border-input relative top-4 h-px border-dashed" />

				<Button
					on:click={addNewCategory}
					variant="secondary"
					class="absolute left-1/2 h-8 w-8 -translate-x-1/2 p-0  "
				>
					<Plus class="h-4 w-4 " />
				</Button>
			</div>
			<div class="flex w-full justify-end">
				<Button type="submit" disabled={formStateCategories === "loading"}>
					Save
					{#if formStateCategories === "loading"}
						<Loader class="ml-2 inline h-4 w-4 animate-spin" />
					{/if}
				</Button>
			</div>
		</form>
	</Card.Content>
</Card.Root>

<Card.Root class="mt-4">
	<Card.Header class="border-b">
		<Card.Title>Site Footer</Card.Title>
		<Card.Description>
			Configure the footer of your site. This is the first section that appears on your site.
		</Card.Description>
	</Card.Header>
	<Card.Content>
		<form class="mx-auto mt-4 space-y-4" on:submit|preventDefault={formSubmitFooter}>
			<div class="flex w-full flex-row justify-evenly gap-2">
				<div class="w-full">
					<textarea
						bind:value={footerHTML}
						class="mt-2 h-48 w-full rounded-sm border p-2"
						placeholder="eg. <p>Powered by Kener</p>"
					></textarea>
				</div>
			</div>

			<div class="flex w-full justify-end">
				<Button type="submit" disabled={formStateFooter === "loading"}>
					Save
					{#if formStateFooter === "loading"}
						<Loader class="ml-2 inline h-4 w-4 animate-spin" />
					{/if}
				</Button>
			</div>
		</form>
	</Card.Content>
</Card.Root>
