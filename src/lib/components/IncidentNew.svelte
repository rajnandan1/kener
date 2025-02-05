<script>
	import { formatDistanceToNow, formatDistance } from "date-fns";

	import * as Accordion from "$lib/components/ui/accordion";
	import { l, f, fd, fdn } from "$lib/i18n/client";
	import { base } from "$app/paths";
	export let incident;
	export let index;
	export let lang;
	export let selectedLang = "en";
	let startTime = new Date(incident.start_date_time * 1000);
	let endTime = new Date();
	let nowTime = new Date();
	if (incident.end_date_time) {
		endTime = new Date(incident.end_date_time * 1000);
	}
	let incidentType = incident.incident_type;
	const lastedFor = fd(startTime, endTime, selectedLang);
	const startedAt = fdn(startTime, selectedLang);

	let isFuture = false;
	//is future incident
	if (nowTime < startTime) {
		isFuture = true;
	}

	let incidentDateSummary = "";
	let maintenanceBadge = "";
	let maintenanceBadgeColor = "";
	if (!isFuture && incident.state != "RESOLVED") {
		incidentDateSummary = l(lang, "Started %startedAt, still ongoing", {
			startedAt
		});
		maintenanceBadge = "Maintenance in Progress";
		maintenanceBadgeColor = "text-maintenance-in-progress";
	} else if (!isFuture && incident.state == "RESOLVED") {
		incidentDateSummary = l(lang, "Started %startedAt, lasted for %lastedFor", {
			startedAt,
			lastedFor
		});
		maintenanceBadge = "Maintenance Completed";
		maintenanceBadgeColor = "text-maintenance-completed";
	} else if (isFuture && incident.state != "RESOLVED") {
		incidentDateSummary = l(lang, "Starts %startedAt", { startedAt });
		maintenanceBadge = "Upcoming Maintenance";
		maintenanceBadgeColor = "text-upcoming-maintenance";
	} else if (isFuture && incident.state == "RESOLVED") {
		incidentDateSummary = l(lang, "Starts %startedAt, will last for %lastedFor", {
			startedAt,
			lastedFor
		});
		maintenanceBadge = "Upcoming Maintenance";
		maintenanceBadgeColor = "text-upcoming-maintenance";
	}
</script>

<div class="newincident relative grid w-full grid-cols-12 gap-2 px-0 py-0 last:border-b-0">
	<div class="col-span-12">
		<Accordion.Root bind:value={index} class="accor">
			<Accordion.Item value="incident-0">
				<Accordion.Trigger class="px-4 hover:bg-muted hover:no-underline">
					<div class="w-full text-left hover:no-underline">
						{#if incidentType == "INCIDENT"}
							<p
								class="scroll-m-20 text-xs font-semibold leading-5 tracking-normal badge-{incident.state}"
							>
								{l(lang, incident.state)}
							</p>
						{:else if incidentType == "MAINTENANCE"}
							<p
								class="{maintenanceBadgeColor} scroll-m-20 text-xs font-semibold leading-5 tracking-normal"
							>
								{l(lang, maintenanceBadge)}
							</p>
						{/if}

						<p class="scroll-m-20 text-lg font-medium tracking-tight">
							{incident.title}
						</p>
						{#if !!incidentDateSummary}
							<p
								class="scroll-m-20 text-sm font-medium tracking-wide text-muted-foreground"
							>
								{incidentDateSummary}
							</p>
						{/if}
					</div>
				</Accordion.Trigger>
				<Accordion.Content>
					<div class="px-4 pt-2">
						{#if incident.monitors.length > 0}
							<div class="flex gap-2">
								{#each incident.monitors as monitor}
									<div
										class="tag-affected-text flex gap-x-2 rounded-md bg-secondary px-1 py-1 pr-2"
									>
										<div
											class="bg-api-{monitor.impact_type.toLowerCase()} rounded px-1.5 py-1 text-xs font-semibold text-primary-foreground"
										>
											{monitor.impact_type}
										</div>
										{#if monitor.image}
											<img src={base + monitor.image} class="mt-1 h-4 w-4" />
										{/if}
										<div class="mt-0.5 font-medium">
											{monitor.name}
										</div>
									</div>
								{/each}
							</div>
						{/if}
						<p class="my-3 text-xs font-semibold uppercase text-muted-foreground">
							{l(lang, "Updates")}
						</p>
						{#if incident.comments.length > 0}
							{#if incidentType == "INCIDENT"}
								<ol class="relative mt-2 pl-14">
									{#each incident.comments as comment}
										<li
											class="relative border-l pb-4 pl-[4.5rem] last:border-0"
										>
											<div
												class="absolute top-0 w-28 -translate-x-32 rounded border bg-secondary px-1.5 py-1 text-center text-xs font-semibold"
											>
												{l(lang, comment.state)}
											</div>

											<time
												class=" mb-1 text-sm font-medium leading-none text-muted-foreground"
											>
												{f(
													new Date(comment.commented_at * 1000),
													"MMMM do yyyy, h:mm:ss a",
													selectedLang
												)}
											</time>

											<p class="mb-4 text-sm font-normal">
												{comment.comment}
											</p>
										</li>
									{/each}
								</ol>
							{:else if incidentType == "MAINTENANCE"}
								<ol class="relative mt-2 pl-0">
									{#each incident.comments as comment}
										<li class="relative pb-2 last:border-0">
											<time
												class=" mb-1 text-sm font-medium leading-none text-muted-foreground"
											>
												{f(
													new Date(comment.commented_at * 1000),
													"MMMM do yyyy, h:mm:ss a",
													selectedLang
												)}
											</time>

											<p class="mb-2 text-sm font-normal">
												{comment.comment}
											</p>
										</li>
									{/each}
								</ol>
							{/if}
						{:else}
							<p class="text-sm font-medium">
								{l(lang, "No Updates Yet")}
							</p>
						{/if}
					</div>
				</Accordion.Content>
			</Accordion.Item>
		</Accordion.Root>
	</div>
</div>
