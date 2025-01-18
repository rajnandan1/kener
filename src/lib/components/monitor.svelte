<script>
	import * as Popover from "$lib/components/ui/popover";
	import { onMount } from "svelte";
	import { Badge } from "$lib/components/ui/badge";
	import { Button } from "$lib/components/ui/button";
	import { base } from "$app/paths";
	import { sub, startOfDay, getUnixTime } from "date-fns";

	import {
		Share2,
		Link,
		CopyCheck,
		Code,
		TrendingUp,
		Percent,
		Loader,
		ChevronLeft,
		ChevronRight
	} from "lucide-svelte";
	import { buttonVariants } from "$lib/components/ui/button";
	import { createEventDispatcher } from "svelte";
	import { afterUpdate } from "svelte";
	import axios from "axios";
	import { l, summaryTime, f } from "$lib/i18n/client";
	import { hoverAction, clickOutsideAction, slide } from "svelte-legos";
	import LoaderBoxes from "$lib/components/loaderbox.svelte";
	import NumberFlow from "@number-flow/svelte";
	import Incident from "$lib/components/IncidentNew.svelte";

	const dispatch = createEventDispatcher();

	export let monitor;

	export let localTz;
	export let lang;
	export let embed = false;
	export let selectedLang = "en";

	let _0Day = {};
	let _90Day = monitor.pageData._90Day;
	let uptime90Day = monitor.pageData.uptime90Day;
	let incidents = {};
	let dayIncidentsFull = [];

	function loadIncidents() {
		axios
			.post(`${base}/api/today/incidents`, {
				tag: monitor.tag,
				startTs: monitor.pageData.midnight90DaysAgo,
				endTs: monitor.pageData.midnightTomorrow,
				localTz: localTz
			})
			.then((response) => {
				if (response.data) {
					incidents = response.data;
				}
			})
			.catch((error) => {
				console.log(error);
			});
	}

	function getToday(startTs, incidentIDs) {
		axios
			.post(`${base}/api/today`, {
				monitor: monitor,
				localTz: localTz,
				startTs: startTs,
				incidentIDs: incidentIDs
			})
			.then((response) => {
				if (response.data) {
					_0Day = response.data._0Day;
					dayUptime = response.data.uptime;
					dayIncidentsFull = response.data.incidents;
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
			text: `${l(lang, "90 Days")}`,
			startTs: getUnixTime(startOfDay(sub(new Date(), { days: 90 }))),
			value: uptime90Day
		},
		{
			text: `${l(lang, "60 Days")}`,
			startTs: getUnixTime(startOfDay(sub(new Date(), { days: 59 })))
		},
		{
			text: `${l(lang, "30 Days")}`,
			startTs: getUnixTime(startOfDay(sub(new Date(), { days: 29 })))
		},
		{
			text: `${l(lang, "14 Days")}`,
			startTs: getUnixTime(startOfDay(sub(new Date(), { days: 13 })))
		},
		{
			text: `${l(lang, "7 Days")}`,
			startTs: getUnixTime(startOfDay(sub(new Date(), { days: 6 })))
		},
		{
			text: l(lang, "Today"),
			startTs: getUnixTime(startOfDay(new Date()))
		}
	];

	//start of the week moment
	let rolledAt = 0;
	let rollerLoading = false;
	async function rollSummary(r) {
		let newRolledAt = (rolledAt + r) % uptimesRollers.length;

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
		scrollToRight();
		loadIncidents();
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
	function dailyDataGetter(e, bar, incidentObj) {
		if (embed) {
			return;
		}
		let incidentIDs = incidentObj?.ids || [];
		dayUptime = "NA";
		dateFetchedFor = f(new Date(bar.timestamp * 1000), "EEEE, MMMM do, yyyy", selectedLang);
		showDailyDataModal = true;
		loadingDayData = true;
		dayIncidentsFull = [];
		setTimeout(() => {
			getToday(bar.timestamp, incidentIDs);
		}, 750);
	}
</script>

<div class="monitor relative grid w-full grid-cols-12 gap-2 pb-2 pt-0 md:w-[655px]">
	{#if !!!embed}
		<div class="col-span-12 md:w-[546px]">
			<div class="pt-0">
				<div class="scroll-m-20 pr-5 text-xl font-medium tracking-tight">
					{#if monitor.image}
						<img
							src={base + monitor.image}
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
	<div class="col-span-12 min-h-[94px] pt-2 md:w-[546px]">
		<div class="col-span-12">
			<div class="flex justify-between">
				<div class=" ">
					<div class="flex gap-x-1">
						{#if rolledAt > 0}
							<Button
								variant="ghost"
								class="h-5 w-5 p-0"
								on:click={() => rollSummary(-1)}
							>
								<ChevronLeft class="h-4 w-4" />
							</Button>
						{/if}
						<div class="flex text-xs font-semibold">
							<span>
								{uptimesRollers[rolledAt].text}
							</span>

							<span class="">
								{#if rollerLoading}
									<Loader class="mx-1 -mt-0.5 inline h-4 w-4 animate-spin" />
								{:else}
									<TrendingUp class="mx-1 -mt-0.5 inline h-3 w-3" />
								{/if}
								{#if isNaN(uptimesRollers[rolledAt].value)}
									<span class="text-muted-foreground">-</span>
								{:else}
									<NumberFlow
										value={uptimesRollers[rolledAt].value}
										format={{
											notation: "standard",
											minimumFractionDigits: 4,
											maximumFractionDigits: 4
										}}
										suffix="%"
									/>
								{/if}
							</span>
						</div>
						{#if rolledAt < uptimesRollers.length - 1}
							<Button
								variant="ghost"
								class="h-5 w-5 p-0"
								on:click={() => rollSummary(1)}
							>
								<ChevronRight class="h-4 w-4" />
							</Button>
						{/if}
					</div>
				</div>
				<div class="pt-0.5 text-right">
					<div
						class="text-api-up truncate text-xs font-semibold text-{monitor.pageData
							.summaryColorClass}"
					>
						{l(lang, summaryTime(monitor.pageData.summaryStatus), {
							status: monitor.pageData.summaryStatus,
							duration: monitor.pageData.summaryDuration
						})}
					</div>
				</div>
			</div>
			<div
				class="relative col-span-12 mt-1"
				use:clickOutsideAction
				on:clickoutside={(e) => {
					showDailyDataModal = false;
				}}
			>
				<div
					class="daygrid90 flex min-h-[60px] justify-start overflow-x-auto overflow-y-hidden py-1"
				>
					{#each Object.entries(_90Day) as [ts, bar]}
						<a
							data-ts={ts}
							use:hoverAction
							on:hover={(e) => {
								show90Inline(e, bar);
							}}
							on:click={(e) => {
								dailyDataGetter(e, bar, incidents[ts]);
							}}
							style="transition: opacity {bar.ij * 2 + 100}ms ease-in;"
							href="#"
							class="oneline h-[34px] w-[6px]
							{bar.border ? 'opacity-100' : 'opacity-20'} pb-1"
						>
							<div
								class="oneline-in h-[30px] bg-{bar.cssClass} mx-auto w-[4px] rounded-{monitor.pageData.barRoundness.toUpperCase() ==
								'SHARP'
									? 'none'
									: 'sm'}"
							></div>
							{#if !!incidents[ts]}
								<div
									style="transition-delay: {Math.floor(
										Math.random() * (1500 - 500 + 1)
									) + 500}ms;"
									class="bg-api-{incidents[
										ts
									].monitor_impact.toLowerCase()} comein absolute -bottom-[3px] left-[1px] h-[4px] w-[4px] rounded-full"
								></div>
							{/if}
						</a>
						{#if bar.showDetails}
							<div class="show-hover absolute text-sm">
								<div class="text-{bar.textClass} text-xs font-semibold">
									{f(
										new Date(bar.timestamp * 1000),
										"EEEE, MMMM do, yyyy",
										selectedLang
									)}
									-
									{l(lang, summaryTime(bar.summaryStatus), {
										status: bar.summaryStatus,
										duration: bar.summaryDuration
									})}
								</div>
							</div>
						{/if}
					{/each}
				</div>
				{#if showDailyDataModal}
					<div
						transition:slide={{ direction: "bottom" }}
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
						{#if dayIncidentsFull.length > 0}
							<div class="-mx-2 mb-4 grid grid-cols-1">
								<div class="col-span-1 px-2">
									<Badge variant="outline" class="border-0 pl-0">
										{l(lang, "Incident Updates")}
									</Badge>
								</div>
								{#each dayIncidentsFull as incident, index}
									<div class="col-span-1">
										<Incident {incident} {lang} index="incident-{index}" />
									</div>
								{/each}
							</div>
						{/if}
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
												{new Date(
													bar.timestamp * 1000
												).toLocaleTimeString()}
											</p>
											{#if bar.status != "NO_DATA"}
												<p class="pl-2">
													{l(lang, bar.status)}
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
		</div>
	</div>
</div>
