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
	import axios from "axios";
	import { l, summaryTime, n, ampm } from "$lib/i18n/client";
	import { analyticsEvent } from "$lib/analytics";
	import { hoverAction, clickOutsideAction, slide } from "svelte-legos";
	import LoaderBoxes from "$lib/components/loaderbox.svelte";
	import moment from "moment";
	import NumberFlow from "@number-flow/svelte";

	const dispatch = createEventDispatcher();

	export let monitor;

	export let localTz;
	export let lang;

	let _0Day = {};
	let _90Day = monitor.pageData._90Day;
	let uptime90Day = monitor.pageData.uptime90Day;

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
		if (monitor.embed) {
			return;
		}
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
						<Button
							class="wiggle h-5 p-0 text-muted-foreground hover:text-primary"
							variant="link"
							on:click={(e) => {
								dispatch("show_shareMenu", {
									monitor: monitor
								});
							}}
						>
							<Share2 class="h-4 w-4 " />
						</Button>
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
						class="h-8  justify-start text-xs font-semibold transition-all"
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

						<span class="block w-full text-right">
							{#if rollerLoading}
								<Loader class="mx-1 inline h-4 w-4 animate-spin" />
							{:else}
								<TrendingUp class="ml-1 mr-1 inline h-3 w-3" />
							{/if}
							<NumberFlow
								value={uptimesRollers[rolledAt].value}
								format={{
									notation: "standard",
									minimumFractionDigits: 4,
									maximumFractionDigits: 4
								}}
								suffix="%"
							/>
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
				<div class="daygrid90 flex min-h-[60px] overflow-x-auto overflow-y-hidden py-1">
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
								class="oneline-in h-[30px] bg-{bar.cssClass} mx-auto w-[4px] rounded-{monitor.pageData.barRoundness.toUpperCase() ==
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
						transition:slide={{ direction: "bottom" }}
						use:clickOutsideAction
						on:clickoutside={(e) => {
							let classList = JSON.stringify(e.explicitOriginalTarget.classList);

							if (classList.indexOf("oneline") != -1) {
								return;
							}
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
				<p class="z-4 absolute bottom-3 right-14 float-right text-right">
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
