<script>
	import "../app.postcss";
	import "../kener.css";
	import Nav from "$lib/components/nav.svelte";
	import { onMount } from "svelte";
	import { base } from "$app/paths";
	import { Button } from "$lib/components/ui/button";
	import { ModeWatcher } from "mode-watcher";
	import Sun from "lucide-svelte/icons/sun";
	import Moon from "lucide-svelte/icons/moon";
	import { Languages } from "lucide-svelte";
	import * as DropdownMenu from "$lib/components/ui/dropdown-menu";

	export let data;

	let defaultLocaleKey = data.selectedLang;
	let defaultTheme = data.site?.theme || "light";

	const allLocales = data.site.i18n?.locales;

	function toggleMode(defaultTheme) {
		let classList = document.documentElement.classList;
		if (classList.contains("dark")) {
			classList.remove("dark");
			localStorage.setItem("theme", "light");
		} else {
			classList.add("dark");
			localStorage.setItem("theme", "dark");
		}
	}
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

	function setTheme() {
		let theme = localStorage.getItem("theme") || defaultTheme;
		if (theme === "dark") {
			document.documentElement.classList.add("dark");
		} else {
			document.documentElement.classList.remove("dark");
		}
	}

	onMount(() => {
		let localTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
		if (localTz != data.localTz) {
			if (data.isBot === false) {
				document.cookie = "localTz=" + localTz + ";max-age=" + 60 * 60 * 24 * 365 * 30;
				location.reload();
			}
		}
		setTheme();
	});
</script>

<svelte:head>
	<title>{data.site.title}</title>
	<link rel="icon" id="kener-app-favicon" href="{base}/logo96.png" />
	<link href={data.site.font.cssSrc} rel="stylesheet" />
	{#each Object.entries(data.site.metaTags) as [key, value]}
		<meta name={key} content={value} />
	{/each}
</svelte:head>
<main style="--font-family: {data.site.font.family}">
	{#if data.showNav}
		<Nav {data} />
	{/if}
	<div class="min-h-screen">
		<slot />
	</div>

	{#if data.showNav && !!data.site.footerHTML}
		<footer class="z-10 py-6 md:px-8 md:py-0">
			<div
				class="container relative flex max-w-[840px] flex-col items-center justify-center gap-4 pl-0 md:h-24 md:flex-row"
			>
				<div class="flex flex-col items-center gap-4 px-8 md:flex-row md:gap-2 md:px-0">
					<p class="text-center text-sm leading-loose text-muted-foreground md:text-left">
						{@html data.site.footerHTML}
					</p>
				</div>
			</div>
		</footer>
	{/if}
	<div class="fixed bottom-4 right-4">
		{#if data.site.i18n && data.site.i18n.locales && Object.keys(data.site.i18n.locales).length > 1}
			<DropdownMenu.Root>
				<DropdownMenu.Trigger>
					<Button variant="ghost" size="icon" class="flex">
						<Languages class="h-[1.2rem] w-[1.2rem]" />
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

		<Button on:click={toggleMode} variant="ghost" size="icon" class="flex">
			<Sun
				class="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0"
			/>
			<Moon
				class="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100"
			/>
			<span class="sr-only">Toggle theme</span>
		</Button>
	</div>
</main>

<style>
	/* Apply the global font family using the CSS variable */
	* {
		font-family: var(--font-family);
	}
</style>
