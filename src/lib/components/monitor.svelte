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
	import { analyticsEvent } from "$lib/analytics";
	import { hoverAction } from "svelte-legos";
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
	let copiedBadgeDotStandard = false;
	let copiedBadgeDotPing = false;

	let protocol;
	let domain;

	let pathMonitorLink;
	function copyLinkToClipboard() {
		analyticsEvent("monitor_link_copied", {
			tag: monitor.tag
		});
		navigator.clipboard.writeText(pathMonitorLink);
		copiedLink = true;
		setTimeout(function () {
			copiedLink = false;
		}, 1500);
	}

	let pathMonitorBadgeUptime;
	function copyUptimeBadge() {
		analyticsEvent("monitor_uptime_badge_copied", {
			tag: monitor.tag
		});
		navigator.clipboard.writeText(pathMonitorBadgeUptime);
		copiedBadgeUptime = true;
		setTimeout(function () {
			copiedBadgeUptime = false;
		}, 1500);
	}

	let pathMonitorBadgeStatus;
	function copyStatusBadge() {
		analyticsEvent("monitor_status_badge_copied", {
			tag: monitor.tag
		});
		navigator.clipboard.writeText(pathMonitorBadgeStatus);
		copiedBadgeStatus = true;
		setTimeout(function () {
			copiedBadgeStatus = false;
		}, 1500);
	}

	let pathMonitorBadgeDot;
	function copyDotStandard() {
		analyticsEvent("monitor_svg_standard_copied", {
			tag: monitor.tag
		});

		navigator.clipboard.writeText(pathMonitorBadgeDot);
		copiedBadgeDotStandard = true;
		setTimeout(function () {
			copiedBadgeDotStandard = false;
		}, 1500);
	}

	let pathMonitorBadgeDotPing;
	function copyDotPing() {
		analyticsEvent("monitor_svg_pinging_copied", {
			tag: monitor.tag
		});
		navigator.clipboard.writeText(pathMonitorBadgeDotPing);
		copiedBadgeDotPing = true;
		setTimeout(function () {
			copiedBadgeDotPing = false;
		}, 1500);
	}

	function copyScriptTagToClipboard() {
		//get domain with port number

		analyticsEvent("monitor_embed_copied", {
			tag: monitor.tag,
			type: embedType
		});

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
			analyticsEvent("monitor_view_today", {
				tag: monitor.tag
			});
			getToday();
		}
		if (view == "90day") {
			analyticsEvent("monitor_view_90day", {
				tag: monitor.tag
			});
			scrollToRight();
		}
	}

	onMount(async () => {
		//for each div with class 90daygrid scroll to right most for mobile view needed
		scrollToRight();
		protocol = window.location.protocol;
		domain = window.location.host;
		pathMonitorLink = `${protocol}//${domain}${base}/monitor-${monitor.tag}`;
		pathMonitorBadgeUptime = `${protocol}//${domain}${base}/badge/${monitor.tag}/uptime`;
		pathMonitorBadgeStatus = `${protocol}//${domain}${base}/badge/${monitor.tag}/status`;
		pathMonitorBadgeDot = `${protocol}//${domain}${base}/badge/${monitor.tag}/dot`;
		pathMonitorBadgeDotPing = `${protocol}//${domain}${base}/badge/${monitor.tag}/dot?animate=ping`;
	});
	afterUpdate(() => {
		dispatch("heightChange", {});
	});
	function show90Inline(e, bar) {
		if (e.detail.hover) {
			_90Day[bar.timestamp].showDetails = true;
		} else {
			_90Day[bar.timestamp].showDetails = false;
		}
	}
</script>

<div class="monitor relative grid w-full grid-cols-12 gap-2 pb-2 pt-0 md:w-[655px]">
	{#if !!!monitor.embed}
		<div class="col-span-12 md:w-[546px]">
			<div class="pt-0">
				<div class="scroll-m-20 pr-5 text-xl font-medium tracking-tight">
					{#if monitor.image}
						<img
							src={monitor.image.startsWith("/")
								? base + monitor.image
								: monitor.image}
							class="absolute left-6 top-6 inline h-5 w-5"
							alt={monitor.name}
							srcset=""
						/>
					{/if}
					<p class="overflow-hidden text-ellipsis whitespace-nowrap">
						{monitor.name}
					</p>

					<p class="mt-1 text-xs font-medium text-muted-foreground">
						{#if !!monitor.description}
							{@html monitor.description}
						{/if}
					</p>
					<Popover.Root>
						<Popover.Trigger class="absolute right-14 top-5 h-5 w-5 p-0">
							<Button
								class="h-5 p-0"
								variant="link"
								on:click={(e) => {
									analyticsEvent("monitor_share_menu_open", {
										tag: monitor.tag
									});
								}}
							>
								<Share2 class="h-4 w-4 text-muted-foreground" />
							</Button>
						</Popover.Trigger>
						<Popover.Content class="w-[375px] max-w-full p-0">
							<div class="p-4">
								<h2 class="mb-1 text-sm font-semibold">
									{l(lang, "monitor.share")}
								</h2>
								<p class="mb-2 text-xs text-muted-foreground">
									{l(lang, "monitor.share_desc")}
								</p>
								<Button
									class="h-8 pr-4 text-xs"
									variant="secondary"
									on:click={copyLinkToClipboard}
								>
									{#if !copiedLink}
										<Link class="mr-2 inline" size={12} />
										<span class="font-medium">
											{l(lang, "monitor.cp_link")}
										</span>
									{:else}
										<CopyCheck class="mr-2 inline" size={12} />
										<span class="font-medium">
											{l(lang, "monitor.cpd_link")}
										</span>
									{/if}
								</Button>
							</div>
							<hr />
							<div class="p-4">
								<h2 class="mb-1 text-sm font-semibold">
									{l(lang, "monitor.embed")}
								</h2>
								<p class="mb-1 text-xs text-muted-foreground">
									{l(lang, "monitor.embed_desc")}
								</p>
								<div class="mb-4 grid grid-cols-2 gap-2">
									<div class="col-span-1">
										<h3 class="mb-2 text-xs">
											{l(lang, "monitor.theme")}
										</h3>
										<RadioGroup.Root bind:value={theme} class=" flex">
											<div class="flex items-center space-x-2">
												<RadioGroup.Item value="light" id="light-theme" />
												<Label class="text-xs" for="light-theme"
													>{l(lang, "monitor.theme_light")}</Label
												>
											</div>
											<div class="flex items-center space-x-2">
												<RadioGroup.Item value="dark" id="dark-theme" />
												<Label class="text-xs" for="dark-theme"
													>{l(lang, "monitor.theme_dark")}</Label
												>
											</div>
											<RadioGroup.Input name="theme" />
										</RadioGroup.Root>
									</div>
									<div class="col-span-1 pl-2">
										<h3 class="mb-2 text-xs">
											{l(lang, "monitor.mode")}
										</h3>
										<RadioGroup.Root bind:value={embedType} class="flex">
											<div class="flex items-center space-x-2">
												<RadioGroup.Item value="js" id="js-embed" />
												<Label class="text-xs" for="js-embed"
													>&#x3C;script&#x3E;</Label
												>
											</div>
											<div class="flex items-center space-x-2">
												<RadioGroup.Item value="iframe" id="iframe-embed" />
												<Label class="text-xs" for="iframe-embed"
													>&#x3C;iframe&#x3E;</Label
												>
											</div>
											<RadioGroup.Input name="embed" />
										</RadioGroup.Root>
									</div>
								</div>
								<Button
									class="h-8  px-2 pr-4 text-xs"
									variant="secondary"
									on:click={copyScriptTagToClipboard}
								>
									{#if !copiedEmbed}
										<Code class="mr-2 inline" size={12} />
										<span class=" font-medium">
											{l(lang, "monitor.cp_code")}
										</span>
									{:else}
										<CopyCheck class="mr-2 inline" size={12} />
										<span class="font-medium">
											{l(lang, "monitor.cpd_code")}
										</span>
									{/if}
								</Button>
							</div>

							<hr />
							<div class="p-4">
								<h2 class="mb-1 text-sm font-semibold">
									{l(lang, "monitor.badge")}
								</h2>
								<p class="mb-2 text-xs text-muted-foreground">
									{l(lang, "monitor.badge_desc")}
								</p>
								<Button
									class="h-8  px-2 pr-4 text-xs"
									variant="secondary"
									on:click={copyStatusBadge}
								>
									{#if !copiedBadgeStatus}
										<TrendingUp class="mr-2 inline" size={12} />
										<span class="font-medium">
											{l(lang, "monitor.status")}
											{l(lang, "monitor.badge")}</span
										>
									{:else}
										<CopyCheck class="mr-2 inline" size={12} />
										<span class="font-medium">
											{l(lang, "monitor.copied")}
											{l(lang, "monitor.badge")}
										</span>
									{/if}
								</Button>
								<Button
									class="h-8  px-2 pr-4 text-xs"
									variant="secondary"
									on:click={copyUptimeBadge}
								>
									{#if !copiedBadgeUptime}
										<Percent class="mr-2 inline" size={12} />
										<span class="font-medium">
											{l(lang, "monitor.uptime")}
											{l(lang, "monitor.badge")}
										</span>
									{:else}
										<CopyCheck class="mr-2 inline" size={12} />
										<span class="font-medium">
											{l(lang, "monitor.copied")}
											{l(lang, "monitor.badge")}
										</span>
									{/if}
								</Button>
							</div>

							<hr />

							<div class="p-4">
								<h2 class="mb-1 text-sm font-semibold">
									{l(lang, "monitor.status_svg")}
								</h2>
								<p class="mb-2 text-xs text-muted-foreground">
									{l(lang, "monitor.status_svg_desc")}
								</p>
								<Button
									class="h-8  px-2 pr-4 text-xs"
									variant="secondary"
									on:click={copyDotStandard}
								>
									{#if !copiedBadgeDotStandard}
										<img
											src={pathMonitorBadgeDot}
											class="mr-1 inline h-5"
											alt="status"
										/>
										<span class="font-medium">
											{l(lang, "monitor.standard")}
										</span>
									{:else}
										<CopyCheck class="mr-2 inline h-5 w-5" />
										<span class="font-medium">
											{l(lang, "monitor.standard")}
										</span>
									{/if}
								</Button>
								<Button
									class="h-8  px-2 pr-4 text-xs"
									variant="secondary"
									on:click={copyDotPing}
								>
									{#if !copiedBadgeDotPing}
										<img
											src={pathMonitorBadgeDotPing}
											class="mr-1 inline h-5"
											alt="status"
										/>
										<span class="font-medium">
											{l(lang, "monitor.pinging")}
										</span>
									{:else}
										<CopyCheck class="mr-2 inline h-5 w-5" />
										<span class="font-medium">
											{l(lang, "monitor.pinging")}
										</span>
									{/if}
								</Button>
							</div>
						</Popover.Content>
					</Popover.Root>
				</div>
			</div>
		</div>
	{/if}
	<div
		class="col-span-12 md:w-[546px] {!!!monitor.embed
			? 'md:col-span-12'
			: 'overflow-hidden'} min-h-[94px] pt-2"
	>
		<div class="col-span-12">
			<div class="grid grid-cols-12">
				<div
					class="{monitor.embed === undefined
						? 'col-span-12'
						: 'col-span-8'}   md:col-span-8"
				>
					<button
						class="inline-block border-r pr-3 text-xs font-semibold {view != '90day'
							? 'text-muted-foreground opacity-70'
							: 'text-primary'}"
						on:click={(e) => {
							switchView("90day");
						}}
					>
						{l(lang, "monitor.90_day")} ► {n(lang, uptime90Day)}%
					</button>
					<button
						class="ml-2 inline-block text-xs font-semibold {view != '0day'
							? 'text-muted-foreground opacity-70'
							: 'text-primary'}"
						on:click={(e) => {
							switchView("0day");
						}}
					>
						{l(lang, "monitor.today")} ► {n(lang, uptime0Day)}%
					</button>
				</div>
				<div
					class="{monitor.embed === undefined
						? 'col-span-12'
						: 'col-span-4'}   text-right md:col-span-4"
				>
					{#if _90Day[todayDD]}
						<div
							class="text-api-up mt-[4px] truncate text-xs font-semibold text-{_90Day[
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
							<div
								use:hoverAction
								on:hover={(e) => {
									show90Inline(e, bar);
								}}
								class="oneline h-[30px] w-[6px] rounded-sm"
							>
								<div
									class="h-[30px] bg-{bar.cssClass} mr-[2px] w-[4px] rounded-sm"
								></div>
							</div>
							{#if bar.showDetails}
								<div class="show-hover absolute text-sm">
									<div class="text-{bar.cssClass} pt-1 text-xs font-semibold">
										{n(
											lang,
											new Date(bar.timestamp * 1000).toLocaleDateString()
										)}
										{summaryTime(lang, bar.message)}
									</div>
								</div>
							{/if}
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
								class="bg-{bar.cssClass} today-sq m-[1px] h-[10px] w-[10px]"
							></div>
							<div class="hiddenx relative">
								<div
									data-index={ts.index}
									class="message rounded border bg-black p-2 text-xs font-semibold text-white"
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
										<p class="pl-2">
											{l(lang, "statuses." + bar.status)}
										</p>
									{:else}
										<p class="pl-2">-</p>
									{/if}
								</div>
							</div>
						{/each}
					</div>
				</div>
			{/if}
			{#if !!!monitor.embed}
				<p class="text-right">
					<a
						href="{base}/incident/{monitor.folderName}#past_incident"
						class="text-xs font-semibold text-primary"
					>
						{l(lang, "root.recent_incidents")}
					</a>
				</p>
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

	.show-hover {
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
