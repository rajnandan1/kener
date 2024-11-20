<script>
	import "../../app.postcss";
	import "../../kener.css";
	import Nav from "$lib/components/nav.svelte";
	import { onMount } from "svelte";
	import { base } from "$app/paths";
	import { Button } from "$lib/components/ui/button";
	import Sun from "lucide-svelte/icons/sun";
	import Moon from "lucide-svelte/icons/moon";
	import { Languages } from "lucide-svelte";
	import * as DropdownMenu from "$lib/components/ui/dropdown-menu";
	import { analyticsEvent } from "$lib/analytics";
	import { setMode, mode, ModeWatcher } from "mode-watcher";

	export let data;

	let defaultLocaleKey = data.selectedLang;
	let defaultTheme = data.site.theme;

	const allLocales = data.site.i18n?.locales;

	function toggleMode() {
		if ($mode === "light") {
			setMode("dark");
		} else {
			setMode("light");
		}

		analyticsEvent("theme_change", {
			theme: $mode
		});
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
		analyticsEvent("language_change", {
			locale: locale
		});
		location.reload();
	}

	let Analytics;
	onMount(async () => {
		let localTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
		if (localTz != data.localTz) {
			if (data.isBot === false) {
				document.cookie = "localTz=" + localTz + ";max-age=" + 60 * 60 * 24 * 365 * 30;
				location.reload();
			}
		}
		setMode(defaultTheme);
		const providers = data.site.analytics;
		const analyticsPlugins = [];
		if (providers) {
			//loop object
			Object.keys(providers).forEach((key) => {
				const provider = providers[key];
				if (key == "GA") {
					analyticsPlugins.push(
						analyticsGa.default({
							measurementIds: provider.measurementIds
						})
					);
				} else if (key == "AMPLITUDE") {
					analyticsPlugins.push(
						analyticsAmplitude({
							apiKey: provider.measurementIds[0],
							options: {
								trackingOptions: {
									ip_address: false
								}
							}
						})
					);
				} else if (key == "MIXPANEL") {
					analyticsPlugins.push(
						analyticsMixpanel({
							token: provider.measurementIds[0]
						})
					);
				}
			});
		}
		Analytics = _analytics.init({
			app: "kener",
			debug: true,
			version: 100,
			plugins: analyticsPlugins
		});
		Analytics.page();
		if (!!data.bgc && data.bgc[0] == "#") {
			document.body.style.backgroundColor = data.bgc;
		}
	});
	function captureAnalytics(e) {
		const { event, data } = e.detail;
		Analytics.track(event, data);
	}
</script>

<svelte:window on:analyticsEvent={captureAnalytics} />
<svelte:head>
	<title>{data.site.title}</title>
	{#if data.site.favicon && data.site.favicon[0] == "/"}
		<link rel="icon" id="kener-app-favicon" href="{base}{data.site.favicon}" />
	{:else if data.site.favicon}
		<link rel="icon" id="kener-app-favicon" href={data.site.favicon} />
	{/if}
	<link href={data.site.font.cssSrc} rel="stylesheet" />
	{#each Object.entries(data.site.metaTags) as [key, value]}
		<meta name={key} content={value} />
	{/each}

	{#if data.site.analytics}
		<script src="https://unpkg.com/analytics/dist/analytics.min.js"></script>
		{#each Object.entries(data.site.analytics) as [key, value]}
			<script data-type={key} src={value.script}></script>
		{/each}
	{/if}
</svelte:head>
<ModeWatcher />
<main style="--font-family: {data.site.font.family};--bg-custom: {data.bgc};">
	{#if data.showNav}
		<Nav {data} />
	{/if}
	<div class="min-h-[70vh]">
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
	{#if !!!data.embed}
		<div class="blurry-bg fixed bottom-4 right-4 z-20">
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
			{#if !!data.site.themeToggle}
				<Button on:click={toggleMode} variant="ghost" size="icon" class="flex">
					<Sun
						class="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0"
					/>
					<Moon
						class="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100"
					/>
					<span class="sr-only">Toggle theme</span>
				</Button>
			{/if}
		</div>
	{/if}
</main>

<style>
	/* Apply the global font family using the CSS variable */
	* {
		font-family: var(--font-family);
	}
	main {
		background-color: var(--bg-custom);
	}
</style>
