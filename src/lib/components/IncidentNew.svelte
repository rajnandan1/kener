<script>
	import moment from "moment";
	import * as Accordion from "$lib/components/ui/accordion";
	export let incident;
	export let index;
	let startTime = incident.start_date_time;
	// let startTime = moment(incident.incident_start_time * 1000).format("MMMM Do YYYY, h:mm:ss a");
	let endTime = parseInt(new Date() / 1000);
	let nowTime = parseInt(new Date() / 1000);
	if (incident.end_date_time) {
		endTime = incident.end_date_time;
	}

	let lastedFor = moment.duration(endTime - startTime, "seconds").humanize();
	let startedAt = moment.duration(nowTime - startTime, "seconds").humanize();
</script>

<div
	class="newincident relative grid w-full grid-cols-12 gap-2 px-0 py-0 last:border-b-0 md:w-[655px]"
>
	<div class="col-span-12">
		<Accordion.Root bind:value={index} class="accor">
			<Accordion.Item value="incident-0">
				<Accordion.Trigger class="px-4 hover:bg-muted hover:no-underline">
					<div class="justify-start text-left hover:no-underline">
						<p
							class="scroll-m-20 text-xs font-semibold leading-5 tracking-normal badge-{incident.state}"
						>
							{incident.state}
						</p>
						<p class="scroll-m-20 text-lg font-medium tracking-tight">
							{incident.title}
						</p>

						<p
							class="scroll-m-20 text-sm font-medium tracking-wide text-muted-foreground"
						>
							{#if incident.state != "RESOLVED"}
								<span>
									Started about {startedAt} ago, still ongoing
								</span>
							{:else}
								<span>
									Started about {startedAt} ago, lasted for about {lastedFor}
								</span>
							{/if}
						</p>
					</div>
				</Accordion.Trigger>
				<Accordion.Content>
					<div class="mt-2 px-4">
						<ol class="relative pl-14">
							{#each incident.comments as comment}
								<li class="relative border-l pb-4 pl-[4.5rem] last:border-0">
									<div
										class="absolute top-0 w-28 -translate-x-32 rounded border bg-secondary px-1.5 py-1 text-center text-xs font-semibold"
									>
										{comment.state}
									</div>
									<time
										class=" mb-1 text-sm font-normal leading-none text-muted-foreground"
									>
										{moment(comment.created_at).format(
											"MMMM Do YYYY, h:mm:ss a"
										)}
									</time>

									<p class="mb-4 text-sm font-normal">
										{comment.comment}
									</p>
								</li>
							{/each}
						</ol>
					</div>
				</Accordion.Content>
			</Accordion.Item>
		</Accordion.Root>
	</div>
</div>
