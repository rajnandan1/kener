<script>
	import { Button } from "$lib/components/ui/button";
	import * as DropdownMenu from "$lib/components/ui/dropdown-menu";
	import { Languages, Menu } from "lucide-svelte";
	import { base } from "$app/paths";
	export let data;
	let defaultLocaleKey = data.selectedLang;
	const allLocales = data.site.i18n?.locales;

	/**
	 * @type {string}
	 */
	let defaultLocaleValue;
	if (!allLocales) {
		defaultLocaleValue = "English";
	} else {
		defaultLocaleValue = allLocales[defaultLocaleKey];
	}
	/**
	 * @param {string} locale
	 */
	function setLanguage(locale) {
		document.cookie = `localLang=${locale};max-age=${60 * 60 * 24 * 365 * 30}`;
		if (locale === defaultLocaleKey) return;
		defaultLocaleValue = allLocales[locale];
		location.reload();
	}
</script>

<div class="one"></div>

<header class="relative z-50 w-full">
	<div class="container flex h-14 items-center">
		<a
				href={data.site.home ? data.site.home : base}
				class="mr-6 flex items-center space-x-2"
			>
				{#if data.site.logo}
					<img src={data.site.logo} class="h-8" alt={data.site.title} srcset="" />
				{/if}
				{#if data.site.title}
					<span class="hidden text-[15px] font-bold md:inline-block lg:text-base">
						{data.site.title}
					</span>
				{/if}
			</a>
		<div class="blurry-bg flex w-full justify-end">
			
			{#if data.site.nav}
				<nav class=" flex-wrap mr-4  items-center space-x-6 text-sm font-medium hidden md:flex">
					{#each data.site.nav as navItem}
						<a href={navItem.url}> {navItem.name} </a>
					{/each}
				</nav>
				<DropdownMenu.Root class="">
					<DropdownMenu.Trigger class="mr-2 flex md:hidden">
						<Button variant="outline" size="sm">
							<Menu size={14}  />
						</Button>
					</DropdownMenu.Trigger>
					<DropdownMenu.Content>
						{#each data.site.nav as navItem}
						<DropdownMenu.Group>
							
								<DropdownMenu.Item>
									<a href={navItem.url}> {navItem.name} </a>
								</DropdownMenu.Item>
						
						</DropdownMenu.Group>
							{/each}
					</DropdownMenu.Content>
				</DropdownMenu.Root>
			{/if}
			{#if data.site.i18n && data.site.i18n.locales && Object.keys(data.site.i18n.locales).length > 1}
				<DropdownMenu.Root>
					<DropdownMenu.Trigger>
						<Button variant="outline" size="sm">
							<Languages size={14} class="mr-2" />
							{defaultLocaleValue}
						</Button>
					</DropdownMenu.Trigger>
					<DropdownMenu.Content>
						<DropdownMenu.Group>
							{#each Object.entries(allLocales) as [key, value]}
								<DropdownMenu.Item
									on:click={(e) => {
										setLanguage(key);
									}}>{value}</DropdownMenu.Item
								>
							{/each}
						</DropdownMenu.Group>
					</DropdownMenu.Content>
				</DropdownMenu.Root>
			{/if}
		</div>
	</div>
</header>
