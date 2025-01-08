<script>
	import moment from "moment";
	import { Badge } from "$lib/components/ui/badge";
	import Incident from "$lib/components/IncidentNew.svelte";
	import { Button } from "$lib/components/ui/button";
	import { ArrowRight, ArrowLeft, CalendarCheck2, ChevronLeft } from "lucide-svelte";
	import { base } from "$app/paths";
	import { goto } from "$app/navigation";

	export let data;
	let incidents = data.incidents;

	let incidentSmartDates = {};

	function tsToDate(mnt) {
		return mnt.unix();
	}

	incidents.forEach((incident) => {
		let startTime = incident.start_date_time;
		let today = moment(startTime * 1000)
			.startOf("day")
			.unix();
		let tomorrow = moment(startTime * 1000)
			.add(1, "days")
			.startOf("day")
			.unix();
		let dayAfterTomorrow = moment(startTime * 1000)
			.add(2, "days")
			.startOf("day")
			.unix();
		let yesterday = moment(startTime * 1000)
			.subtract(1, "days")
			.startOf("day")
			.unix();
		let dayBeforeYesterday = moment(startTime * 1000)
			.subtract(2, "days")
			.startOf("day")
			.unix();

		if (!incidentSmartDates[today]) {
			incidentSmartDates[today] = [];
		}
		if (!incidentSmartDates[tomorrow]) {
			incidentSmartDates[tomorrow] = [];
		}
		if (!incidentSmartDates[dayAfterTomorrow]) {
			incidentSmartDates[dayAfterTomorrow] = [];
		}
		if (!incidentSmartDates[yesterday]) {
			incidentSmartDates[yesterday] = [];
		}
		if (!incidentSmartDates[dayBeforeYesterday]) {
			incidentSmartDates[dayBeforeYesterday] = [];
		}

		incidentSmartDates[today].push(incident);
	});

	//sort the incidentSmartDates ascending
	let sortedIncidentSmartDates = Object.keys(incidentSmartDates).sort((a, b) => a - b);
</script>

<div class="mt-12"></div>
<section class="mx-auto my-2 flex w-full max-w-[655px] flex-1 flex-col items-start justify-center">
	<Button
		variant="secondary"
		class="bounce-left h-8   justify-start  pl-1.5"
		on:click={() => {
			return window.history.back();
		}}
	>
		<ChevronLeft class="arrow mr-1 h-5 w-5" /> Back
	</Button>
</section>
<section class="mx-auto mb-8 flex w-full max-w-4xl flex-1 flex-col items-start justify-center">
	<div
		class="mesh mx-auto w-[655px] max-w-screen-xl rounded-md px-4 py-12 lg:flex lg:items-center"
	>
		<div class="blurry-bg mx-auto max-w-3xl text-center text-muted">
			<h1 class="    text-5xl font-extrabold leading-tight">
				{data.thisMonthName.replace("-", ", ")}
			</h1>
			<p class="mx-auto mt-4 max-w-xl font-medium sm:text-xl">Incidents</p>
		</div>
	</div>

	<div
		class="mx-auto mb-2 mt-4 flex w-full flex-1 flex-col items-start justify-center bg-transparent md:w-[655px]"
	>
		{#if sortedIncidentSmartDates.length == 0}
			<div
				class="mx-auto w-full rounded-md p-12 text-center"
				style="background-image: linear-gradient( 135deg, #2AFADF 10%, #4C83FF 100%);"
			>
				<CalendarCheck2 class="mx-auto mb-4 h-12 w-12 text-green-700" />
				<h1 class=" text-xl font-semibold leading-tight text-[rgba(0,0,0,0.44)]">
					No Incidents on {data.thisMonthName.replace("-", ", ")}
				</h1>
			</div>
		{/if}
		{#each sortedIncidentSmartDates as date}
			<div class="mb-4 grid w-full grid-cols-2 gap-x-4 rounded-md border bg-card">
				<div class="text-md col-span-2 border-b p-2 px-4 font-medium">
					{moment.unix(date).format("dddd, MMMM Do")}
				</div>
				{#if incidentSmartDates[date].length === 0}
					<div class="col-span-2 p-2 px-4 text-sm font-medium text-muted-foreground">
						No incidents
					</div>
				{/if}
				{#each incidentSmartDates[date] as incident, index}
					<div class="newincidents col-span-2">
						<Incident {incident} lang={data.lang} index="incident-{index}" />
					</div>
				{/each}
			</div>
		{/each}
	</div>
	<div
		class="mx-auto mb-2 mt-4 flex w-full flex-1 flex-col items-start justify-center bg-transparent md:w-[655px]"
	>
		<div class="flex w-full justify-between">
			<Button
				type="submit"
				variant="secondary"
				class="bounce-left"
				on:click={() => {
					window.location.href = `${base}/incidents/${data.prevMonthName}`;
				}}
			>
				<ArrowLeft class="arrow mr-2 h-4 w-4" />
				{data.prevMonthName.replace("-", ", ")}
			</Button>
			<Button
				variant="secondary"
				class="bounce-right"
				on:click={() => {
					window.location.href = `${base}/incidents/${data.nextMonthName}`;
				}}
			>
				{data.nextMonthName.replace("-", ", ")}
				<ArrowRight class="arrow ml-2 h-4 w-4" />
			</Button>
		</div>
	</div>
</section>
