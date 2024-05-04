<script>
	import { Badge } from "$lib/components/ui/badge";
	import * as Popover from "$lib/components/ui/popover";
	import { onMount } from "svelte";
	import { Button } from "$lib/components/ui/button";
	import { base } from "$app/paths";
	import {
		ArrowRight,
		Share2,
		Info,
		Link,
		CopyCheck,
		Code,
		TrendingUp,
		Percent
	} from "lucide-svelte";
	import { buttonVariants } from "$lib/components/ui/button";
	import { Skeleton } from "$lib/components/ui/skeleton";
	import { createEventDispatcher } from "svelte";
	import { afterUpdate } from "svelte";
	import * as RadioGroup from "$lib/components/ui/radio-group";
	import { Label } from "$lib/components/ui/label";
	import axios from "axios";
	import { l, summaryTime, n, ampm } from "$lib/i18n/client";
	const dispatch = createEventDispatcher();

	/**
	 * @type {{ pageData: { _90Day: any; uptime0Day: any; uptime90Day: any; }; tag: string; embed: undefined; image: any; name: any; description: any; folderName: any; }}
	 */
	export let monitor;
	/**
	 * @type {any}
	 */
	export let localTz;
	export let lang;

	let _0Day = {};
	let _90Day = monitor.pageData._90Day;
	let uptime0Day = monitor.pageData.uptime0Day;
	let uptime90Day = monitor.pageData.uptime90Day;
	let theme = "light";
	let embedType = "js";
	let todayDD = Object.keys(_90Day)[Object.keys(_90Day).length - 1];
	let view = "90day";
	let copiedLink = false;
	let copiedEmbed = false;
	let copiedBadgeStatus = false;
	let copiedBadgeUptime = false;

	function copyLinkToClipboard() {
		//get domain with port number
		let domain = window.location.host;
		//get protocol
		let protocol = window.location.protocol;
		let path = `${base}/monitor-${monitor.tag}`;
		navigator.clipboard.writeText(protocol + "//" + domain + path);
		copiedLink = true;
		setTimeout(function () {
			copiedLink = false;
		}, 1500);
	}
	function copyUptimeBadge() {
		let domain = window.location.host;
		let protocol = window.location.protocol;
		let path = `${base}/badge/${monitor.tag}/uptime`;
		navigator.clipboard.writeText(protocol + "//" + domain + path);
		copiedBadgeUptime = true;
		setTimeout(function () {
			copiedBadgeUptime = false;
		}, 1500);
	}
	function copyStatusBadge() {
		let domain = window.location.host;
		let protocol = window.location.protocol;
		let path = `${base}/badge/${monitor.tag}/status`;
		navigator.clipboard.writeText(protocol + "//" + domain + path);
		copiedBadgeStatus = true;
		setTimeout(function () {
			copiedBadgeStatus = false;
		}, 1500);
	}

	function copyScriptTagToClipboard() {
		//get domain with port number
		let domain = window.location.host;
		//get protocol
		let protocol = window.location.protocol;
		let path = `${base}/embed-${monitor.tag}`;
		let scriptTag =
			`<script async src="${protocol + "//" + domain + path}/js?theme=${theme}&monitor=${protocol + "//" + domain + path}"><` +
			"/script>";

		if (embedType == "iframe") {
			scriptTag = `<iframe src="${protocol + "//" + domain + path}?theme=${theme}" width="100%" height="200" allowfullscreen="allowfullscreen" allowpaymentrequest frameborder="0"></iframe>`;
		}
		navigator.clipboard.writeText(scriptTag);
		copiedEmbed = true;
		setTimeout(function () {
			copiedEmbed = false;
		}, 1500);
	}

	function getToday() {
		//axios post using options application json
		setTimeout(() => {
			axios
				.post(`${base}/api/today`, {
					monitor: monitor,
					localTz: localTz
				})
				.then((response) => {
					if (response.data) {
						_0Day = response.data;
					}
				})
				.catch((error) => {
					console.log(error);
				});
		}, 1000 * 1);
	}

	function scrollToRight() {
		setTimeout(() => {
			let divs = document.querySelectorAll(".daygrid90");
			divs.forEach((div) => {
				div.scrollLeft = div.scrollWidth;
			});
		}, 1000 * 0.2);
	}
	function switchView(s) {
		view = s;
		if (Object.keys(_0Day).length == 0) {
			getToday();
		}
		if (view == "90day") {
			scrollToRight();
		}
	}

	onMount(async () => {
		//getToday();
		//for each div with class 90daygrid scroll to right most
		scrollToRight();
	});
	afterUpdate(() => {
		dispatch("heightChange", {});
	});
</script>

<div class="monitor grid w-full grid-cols-12 gap-4 pb-4 md:w-[890px]">
	{#if monitor.embed === undefined}
		<div class="col-span-12 md:col-span-4">
			<div class="pt-1">
				<div class="scroll-m-20 text-2xl font-semibold tracking-tight">
					{#if monitor.image}
						<img
							src={monitor.image}
							class="inline h-6 w-6"
							alt={monitor.name}
							srcset=""
						/>
					{/if}
					<span> {monitor.name} </span>
					<br />
					{#if monitor.description}
						<Popover.Root>
							<Popover.Trigger>
								<span
									class="menu-monitor pb-0 pl-1 pr-0 pt-0 {buttonVariants({
										variant: 'link'
									})}"
								>
									<Info size={12} class="text-muted-foreground" />
								</span>
							</Popover.Trigger>
							<Popover.Content class="text-sm">
								<h2 class="mb-2 text-lg font-semibold">
									{monitor.name}
								</h2>
								<span class="text-sm text-muted-foreground">
									{@html monitor.description}
								</span>
							</Popover.Content>
						</Popover.Root>
					{/if}
					<Popover.Root>
						<Popover.Trigger>
							<span
								class="menu-monitor pb-0 pl-1 pr-0 pt-0 {buttonVariants({
									variant: 'link'
								})}"
							>
								<Share2 size={12} class="text-muted-foreground" />
							</span>
						</Popover.Trigger>
						<Popover.Content class="w-[375px] max-w-full pb-1 pl-1 pr-1">
							<h2 class="mb-1 px-2 text-lg font-semibold">
								{l(lang, "monitor.share")}
							</h2>
							<p class="mb-2 pl-2 text-sm text-muted-foreground">
								{l(lang, "monitor.share_desc")}
							</p>
							<Button class="ml-2" variant="secondary" on:click={copyLinkToClipboard}>
								{#if !copiedLink}
									<Link class="mr-2 inline" size={12} />
									<span class="text-sm font-medium">
										{l(lang, "monitor.cp_link")}
									</span>
								{:else}
									<CopyCheck class="mr-2 inline" size={12} />
									<span class="text-sm font-medium">
										{l(lang, "monitor.cpd_link")}
									</span>
								{/if}
							</Button>
							<h2 class="mb-2 mt-4 px-2 text-lg font-semibold">
								{l(lang, "monitor.embed")}
							</h2>
							<p class="mb-2 pl-2 text-sm text-muted-foreground">
								{l(lang, "monitor.embed_desc")}
							</p>
							<div class="grid grid-cols-2 gap-2">
								<div class="col-span-1 pl-4">
									<h3 class="mb-2 text-sm text-muted-foreground">
										{l(lang, "monitor.theme")}
									</h3>
									<RadioGroup.Root bind:value={theme}>
										<div class="flex items-center space-x-2">
											<RadioGroup.Item value="light" id="light-theme" />
											<Label for="light-theme"
												>{l(lang, "monitor.theme_light")}</Label
											>
										</div>
										<div class="flex items-center space-x-2">
											<RadioGroup.Item value="dark" id="dark-theme" />
											<Label for="dark-theme"
												>{l(lang, "monitor.theme_dark")}</Label
											>
										</div>
										<RadioGroup.Input name="theme" />
									</RadioGroup.Root>
								</div>
								<div class="col-span-1 pl-2">
									<h3 class="mb-2 text-sm text-muted-foreground">
										{l(lang, "monitor.mode")}
									</h3>
									<RadioGroup.Root bind:value={embedType}>
										<div class="flex items-center space-x-2">
											<RadioGroup.Item value="js" id="js-embed" />
											<Label for="js-embed">&#x3C;script&#x3E;</Label>
										</div>
										<div class="flex items-center space-x-2">
											<RadioGroup.Item value="iframe" id="iframe-embed" />
											<Label for="iframe-embed">&#x3C;iframe&#x3E;</Label>
										</div>
										<RadioGroup.Input name="embed" />
									</RadioGroup.Root>
								</div>
							</div>
							<Button
								class="mb-2 ml-2 mt-4"
								variant="secondary"
								on:click={copyScriptTagToClipboard}
							>
								{#if !copiedEmbed}
									<Code class="mr-2 inline" size={12} />
									<span class="text-sm font-medium">
										{l(lang, "monitor.cp_code")}
									</span>
								{:else}
									<CopyCheck class="mr-2 inline" size={12} />
									<span class="text-sm font-medium">
										{l(lang, "monitor.cpd_code")}
									</span>
								{/if}
							</Button>
							<h2 class="mb-2 mt-2 px-2 text-lg font-semibold">
								{l(lang, "monitor.badge")}
							</h2>
							<p class="mb-2 pl-2 text-sm text-muted-foreground">
								{l(lang, "monitor.badge_desc")}
							</p>
							<Button
								class="mb-2 ml-2 mt-2"
								variant="secondary"
								on:click={copyStatusBadge}
							>
								{#if !copiedBadgeStatus}
									<TrendingUp class="mr-2 inline" size={12} />
									<span class="text-sm font-medium">
										{l(lang, "monitor.status")}
										{l(lang, "monitor.badge")}</span
									>
								{:else}
									<CopyCheck class="mr-2 inline" size={12} />
									<span class="text-sm font-medium">
										{l(lang, "monitor.copied")}
										{l(lang, "monitor.badge")}
									</span>
								{/if}
							</Button>
							<Button
								class="mb-2 ml-2 mt-2"
								variant="secondary"
								on:click={copyUptimeBadge}
							>
								{#if !copiedBadgeUptime}
									<Percent class="mr-2 inline" size={12} />
									<span class="text-sm font-medium">
										{l(lang, "monitor.uptime")}
										{l(lang, "monitor.badge")}
									</span>
								{:else}
									<CopyCheck class="mr-2 inline" size={12} />
									<span class="text-sm font-medium">
										{l(lang, "monitor.copied")}
										{l(lang, "monitor.badge")}
									</span>
								{/if}
							</Button>
						</Popover.Content>
					</Popover.Root>
				</div>
			</div>
			<div class="">
				<div class="grid grid-cols-2 gap-0">
					<div class="col-span-1 -mt-2">
						<a
							href="{base}/incident/{monitor.folderName}#past_incident"
							class="pb-0 pl-0 pt-0 text-left text-indigo-500 {buttonVariants({
								variant: 'link'
							})}"
						>
							{l(lang, "root.recent_incidents")}
							<ArrowRight size={16} />
						</a>
					</div>
				</div>
			</div>
		</div>
	{/if}
	<div
		class="col-span-12 md:w-[546px] {monitor.embed === undefined
			? 'md:col-span-8'
			: 'overflow-hidden'} pt-2"
	>
		<div class="col-span-12">
			<div class="grid grid-cols-12">
				<div
					class="{monitor.embed === undefined
						? 'col-span-12'
						: 'col-span-8'} h-[32px] md:col-span-8"
				>
					<button
						class="inline-block"
						on:click={(e) => {
							switchView("90day");
						}}
					>
						<Badge variant={view != "90day" ? "outline" : ""}>
							{l(lang, "monitor.90_day")} ► {n(lang, uptime90Day)}%
						</Badge>
					</button>
					<button
						on:click={(e) => {
							switchView("0day");
						}}
					>
						<Badge variant={view != "0day" ? "outline" : ""}>
							{l(lang, "monitor.today")} ► {n(lang, uptime0Day)}%
						</Badge>
					</button>
				</div>
				<div
					class="{monitor.embed === undefined
						? 'col-span-12'
						: 'col-span-4'} h-[32px] text-right md:col-span-4"
				>
					{#if _90Day[todayDD]}
						<div
							class="text-api-up mt-[4px] truncate text-sm font-semibold text-{_90Day[
								todayDD
							].cssClass}"
							title={_90Day[todayDD].message}
						>
							{summaryTime(lang, _90Day[todayDD].message)}
						</div>
					{/if}
				</div>
			</div>
			{#if view == "90day"}
				<div class="chart-status relative col-span-12 mt-1">
					<div class="daygrid90 flex overflow-x-auto overflow-y-hidden py-1">
						{#each Object.entries(_90Day) as [ts, bar]}
							<div class="oneline h-[30px] w-[6px] rounded-sm">
								<div
									class="h-[30px] bg-{bar.cssClass} mr-[2px] w-[4px] rounded-sm"
								></div>
							</div>
							<div class="show-hover absolute bg-background text-sm">
								<div class="text-{bar.cssClass} font-semibold">
									● {n(lang, new Date(bar.timestamp * 1000).toLocaleDateString())}
									{summaryTime(lang, bar.message)}
								</div>
							</div>
						{/each}
					</div>
				</div>
			{:else}
				<div class="chart-status relative col-span-12 mb-4 mt-1">
					<div class="today-sq-div flex flex-wrap">
						{#if Object.keys(_0Day).length == 0}
							<Skeleton class="mr-1 h-[20px] w-full rounded-full md:w-[546px]" />
						{/if}
						{#each Object.entries(_0Day) as [ts, bar]}
							<div
								data-index={bar.index}
								class="h-[10px] bg-{bar.cssClass} today-sq m-[1px] w-[10px]"
							></div>
							<div class="hiddenx relative">
								<div
									data-index={ts.index}
									class="message rounded border bg-black p-2 text-sm font-semibold text-white"
								>
									<p>
										<span class="text-{bar.cssClass}"> ● </span>
										{ampm(
											lang,
											n(
												lang,
												new Date(bar.timestamp * 1000).toLocaleTimeString()
											)
										)}
									</p>
									{#if bar.status != "NO_DATA"}
										<p class="pl-4">
											{l(lang, "statuses." + bar.status)}
										</p>
									{:else}
										<p class="pl-4">-</p>
									{/if}
								</div>
							</div>
						{/each}
					</div>
				</div>
			{/if}
		</div>
	</div>
</div>

<style>
	.daygrid90 {
		-ms-overflow-style: none; /* Internet Explorer 10+ */
		scrollbar-width: none; /* Firefox */
	}
	.daygrid90::-webkit-scrollbar {
		display: none; /* Safari and Chrome */
	}
	.oneline {
		transition: transform 0.1s ease-in;
		cursor: pointer;
	}
	.oneline:hover {
		transform: scaleY(1.2);
	}

	.oneline:hover + .show-hover {
		display: block !important;
	}

	.show-hover {
		display: none;
		top: 40px;
		padding: 0px;
		text-align: left;
	}

	.today-sq + .hiddenx .message {
		position: absolute;
		white-space: nowrap;
	}

	.today-sq + .hiddenx {
		visibility: hidden;
		z-index: 30;
	}
	.today-sq:hover + .hiddenx {
		visibility: visible;
	}
	.today-sq:hover {
		/* transform: scale(1.1); */
		box-shadow:
			rgba(50, 50, 105, 0.15) 0px 2px 5px 0px,
			rgba(0, 0, 0, 0.05) 0px 1px 1px 0px;
		opacity: 0.75;
		transition: all 0.1s ease-in;
		cursor: pointer;
	}

	.today-sq {
		position: relative;
		z-index: 0;
	}
</style>
