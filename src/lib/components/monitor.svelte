<script>
	import { Badge } from "$lib/components/ui/badge";
	import * as Popover from "$lib/components/ui/popover";
	import { onMount } from "svelte";
	import { Button } from "$lib/components/ui/button";
	import { base } from "$app/paths";
	import { Share2, Link, CopyCheck, Code, TrendingUp, Percent, Loader } from "lucide-svelte";
	import { buttonVariants } from "$lib/components/ui/button";
	import { createEventDispatcher } from "svelte";
	import { afterUpdate } from "svelte";
	import * as RadioGroup from "$lib/components/ui/radio-group";
	import { Label } from "$lib/components/ui/label";
	import axios from "axios";
	import { l, summaryTime, n, ampm } from "$lib/i18n/client";
	import { analyticsEvent } from "$lib/analytics";
	import { hoverAction, clickOutsideAction } from "svelte-legos";
	import LoaderBoxes from "$lib/components/loaderbox.svelte";
	import moment from "moment";
	import NumberFlow from "@number-flow/svelte";

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
	let uptime90Day = monitor.pageData.uptime90Day;
	let theme = "light";
	let embedType = "js";
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

	function getToday(startTs) {
		//axios post using options application json
		loadingDayData = true;
		axios
			.post(`${base}/api/today`, {
				monitor: monitor,
				localTz: localTz,
				startTs: startTs
			})
			.then((response) => {
				if (response.data) {
					_0Day = response.data._0Day;
					dayUptime = response.data.uptime;
				}
				loadingDayData = false;
			})
			.catch((error) => {
				console.log(error);
				loadingDayData = false;
			});
	}

	function scrollToRight() {
		setTimeout(() => {
			let divs = document.querySelectorAll(".daygrid90");
			divs.forEach((div) => {
				div.scrollLeft = div.scrollWidth;
			});
		}, 1000 * 0.2);
	}

	let uptimesRollers = [
		{
			text: "90 Days",
			startTs: moment().subtract(90, "days").startOf("day").unix(),
			value: uptime90Day
		},
		{
			text: "Today",
			startTs: moment().startOf("day").unix()
		},
		{
			text: "This Week",
			startTs: moment().startOf("week").unix()
		},
		{
			text: "7 Days",
			startTs: moment().subtract(6, "days").startOf("day").unix()
		},
		{
			text: "This Month",
			startTs: moment().startOf("month").unix()
		},
		{
			text: "30 Days",
			startTs: moment().subtract(29, "days").startOf("day").unix()
		}
	];

	//start of the week moment
	let rolledAt = 0;
	let rollerLoading = false;
	async function rollSummary(r) {
		let newRolledAt = (rolledAt + 1) % uptimesRollers.length;

		if (uptimesRollers[newRolledAt].value === undefined) {
			rollerLoading = true;
			uptimesRollers[newRolledAt].loading = true;

			let resp = await axios.post(`${base}/api/today/aggregated`, {
				monitor: monitor,
				startTs: uptimesRollers[newRolledAt].startTs
			});
			uptimesRollers[newRolledAt].value = resp.data.uptime;
			rollerLoading = false;
		}
		rolledAt = newRolledAt;
		for (const key in _90Day) {
			if (Object.prototype.hasOwnProperty.call(_90Day, key)) {
				const element = _90Day[key];
				if (key >= uptimesRollers[rolledAt].startTs) {
					_90Day[key].border = true;
				} else {
					_90Day[key].border = false;
				}
			}
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
	let showDailyDataModal = false;
	let dateFetchedFor = "";
	let dayUptime = "NA";
	let loadingDayData = false;
	function dailyDataGetter(e, bar) {
		dayUptime = "NA";
		dateFetchedFor = moment(new Date(bar.timestamp * 1000)).format("dddd, MMMM Do, YYYY");
		showDailyDataModal = true;
		getToday(bar.timestamp);
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
					<div class="absolute right-14 top-5">
						<Popover.Root>
							<Popover.Trigger class="h-5 w-5 p-0">
								<Button
									class="wiggle h-5 p-0 text-muted-foreground hover:text-primary"
									variant="link"
									on:click={(e) => {
										analyticsEvent("monitor_share_menu_open", {
											tag: monitor.tag
										});
									}}
								>
									<Share2 class="h-4 w-4 " />
								</Button>
							</Popover.Trigger>
							<Popover.Content class="w-[375px] max-w-full p-0" side="bottom">
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
													<RadioGroup.Item
														value="light"
														id="light-theme"
													/>
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
													<RadioGroup.Item
														value="iframe"
														id="iframe-embed"
													/>
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
					<Button
						class="h-8   justify-around text-xs font-semibold transition-all"
						variant="secondary"
						disabled={rollerLoading}
						style="transition: width 2s ease-in;"
						on:click={() => {
							scrollToRight();
							rollSummary();
						}}
					>
						<span class="w-16 text-left">
							{uptimesRollers[rolledAt].text}
						</span>

						<span class="text-right">
							{#if rollerLoading}
								<Loader class="mx-1 inline h-4 w-4 animate-spin" />
							{:else}
								<TrendingUp class="ml-1 mr-1 inline h-3 w-3" />
							{/if}

							<NumberFlow value={uptimesRollers[rolledAt].value} />%
						</span>
					</Button>
				</div>
				<div
					class="{monitor.embed === undefined
						? 'col-span-12'
						: 'col-span-4'}   text-right md:col-span-4"
				>
					<div
						class="text-api-up mt-3 truncate text-xs font-semibold text-{monitor
							.pageData.summaryColorClass}"
						title={monitor.pageData.summaryText}
					>
						{summaryTime(lang, monitor.pageData.summaryText)}
					</div>
				</div>
			</div>
			<div class="chart-status relative col-span-12 mt-1">
				<div class="daygrid90 flex overflow-x-auto overflow-y-hidden py-1">
					{#each Object.entries(_90Day) as [ts, bar]}
						<a
							data-ts={ts}
							use:hoverAction
							on:hover={(e) => {
								show90Inline(e, bar);
							}}
							on:click={(e) => {
								dailyDataGetter(e, bar);
							}}
							style="transition: border-color {bar.ij * 2 + 100}ms ease-in;"
							href="#"
							class="oneline h-[34px] w-[6px] border-b-2 {bar.border
								? 'border-indigo-400'
								: 'border-transparent'}  pb-1"
						>
							<div
								class="h-[30px] bg-{bar.cssClass} mx-auto w-[4px] rounded-{monitor.pageData.barRoundness.toUpperCase() ==
								'SHARP'
									? 'none'
									: 'sm'}"
							></div>
						</a>
						{#if bar.showDetails}
							<div class="show-hover absolute text-sm">
								<div class="text-{bar.textClass} pt-1 text-xs font-semibold">
									{moment(new Date(bar.timestamp * 1000)).format(
										"dddd, MMMM Do, YYYY"
									)} -
									{summaryTime(lang, bar.message)}
								</div>
							</div>
						{/if}
					{/each}
				</div>
				{#if showDailyDataModal}
					<div
						use:clickOutsideAction
						on:clickoutside={() => {
							showDailyDataModal = false;
						}}
						class="absolute -left-2 top-10 z-10 mx-auto rounded-sm border bg-card px-[7px] py-[7px] shadow-lg md:w-[560px]"
					>
						<div class="mb-2 flex justify-between text-xs font-semibold">
							<span>{dateFetchedFor}</span>
							{#if !loadingDayData}
								<span>
									<TrendingUp class="mx-1 inline" size={12} />
									{dayUptime}%</span
								>
							{/if}
						</div>
						<div class="flex flex-wrap">
							{#if loadingDayData}
								<LoaderBoxes />
							{:else}
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
														new Date(
															bar.timestamp * 1000
														).toLocaleTimeString()
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
							{/if}
						</div>
					</div>
				{/if}
			</div>

			{#if !!!monitor.embed}
				<p class="text-right">
					<a
						href="{base}/incident/{monitor.folderName}#past_incident"
						class="text-xs font-medium text-muted-foreground hover:text-primary"
					>
						{l(lang, "root.recent_incidents")}
					</a>
				</p>
			{/if}
		</div>
	</div>
</div>
