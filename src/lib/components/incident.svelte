<script>
	import * as Card from "$lib/components/ui/card";
	import { Separator } from "$lib/components/ui/separator";
	import { StatusObj } from "$lib/helpers.js";
	import moment from "moment";
	import { Button } from "$lib/components/ui/button";
	import { Badge } from "$lib/components/ui/badge";
	import { ChevronDown } from "lucide-svelte";
	import * as Collapsible from "$lib/components/ui/collapsible";
	import { l } from "$lib/i18n/client";
	import axios from "axios";
	import { Skeleton } from "$lib/components/ui/skeleton";
	import { base } from "$app/paths";

	export let incident;
	export let variant = "title+body+comments+monitor";
	export let state = "open";
	export let monitor;
	export let lang;

	let blinker = "bg-transparent";
	let incidentPriority = "";
	let incidentDuration = 0;
	if (incident.labels.includes("incident-down")) {
		blinker = "bg-red-500";
		incidentPriority = "DOWN";
	} else if (incident.labels.includes("incident-degraded")) {
		blinker = "bg-yellow-500";
		incidentPriority = "DEGRADED";
	}
	let incidentState = incident.state;
	let incidentClosedAt = incident.incident_end_time;
	let incidentCreatedAt = incident.incident_start_time;
	let incidentMessage = "";
	if (!!incidentClosedAt && !!incidentCreatedAt) {
		//incidentDuration between closed_at and created_at
		incidentDuration = moment(incidentClosedAt * 1000)
			.add(1, "minutes")
			.diff(moment(incidentCreatedAt * 1000), "minutes");
	} else if (!!incidentCreatedAt) {
		//incidentDuration between now and created_at
		incidentDuration = moment().diff(moment(incidentCreatedAt * 1000), "minutes");
	}

	//find a replace /\[start_datetime:(\d+)\]/ empty  in incident.body
	//find a replace /\[end_datetime:(\d+)\]/ empty  in incident.body
	incident.body = incident.body.replace(/\[start_datetime:(\d+)\]/g, "");
	incident.body = incident.body.replace(/\[end_datetime:(\d+)\]/g, "");

	//fetch comments
	incident.comments = [];
	let commentsLoading = true;

	function getComments() {
		if (incident.comments.length > 0) return;
		if (commentsLoading === false) return;
		axios
			.get(`${base}/incident/${incident.number}/comments`)
			.then((response) => {
				incident.comments = response.data;
				commentsLoading = false;
			})
			.catch((error) => {
				// console.log(error);
			});
	}
	$: {
		if (state == "open") {
			getComments();
		}
	}
</script>

<div class="incident-div relative mb-8 grid w-full grid-cols-3 gap-4">
	<div class="col-span-3">
		<Card.Root>
			<Card.Header class="pb-2 pt-3">
				<Card.Title class="relative mb-0">
					{#if incidentPriority != "" && incidentDuration > 0}
						<p class="absolute -top-8 -translate-y-1 leading-10">
							<Badge
								class="-ml-4 bg-card text-xs font-semibold text-[rgba(0,0,0,.6)] text-{StatusObj[
									incidentPriority
								]} "
							>
								{incidentPriority} for {incidentDuration} Minute{incidentDuration >
								1
									? "s"
									: ""}
							</Badge>
						</p>
					{/if}
					{#if monitor.image}
						<img
							src={monitor.image.startsWith("/")
								? base + monitor.image
								: monitor.image}
							class="absolute left-0 top-1 inline h-5 w-5"
							alt=""
							srcset=""
						/>
					{/if}

					<div class="px-8">
						<div class="scroll-m-20 text-xl font-medium tracking-tight">
							{#if variant.includes("monitor")}
								{monitor.name} -
							{/if}
							{#if variant.includes("title")}
								{incident.title}
							{/if}
						</div>
					</div>

					{#if incidentState == "open"}
						<span
							class="absolute -left-[24px] -top-[24px] inline-flex h-[8px] w-[8px] animate-ping rounded-full {blinker} opacity-75"
						></span>
					{/if}
					{#if variant.includes("body") || variant.includes("comments")}
						<div class="toggle absolute right-4 {state}">
							<Button
								variant="outline"
								class="h-6 w-6 rounded-full"
								size="icon"
								on:click={() => {
									state = state == "open" ? "close" : "open";
								}}
							>
								<ChevronDown class="text-muted-foreground" size={12} />
							</Button>
						</div>
					{/if}
				</Card.Title>
				<Card.Description class="-mt-4 px-8 text-xs ">
					{moment(incidentCreatedAt * 1000).format("MMMM Do YYYY, h:mm:ss a")}

					<p class="mt-2 leading-8">
						{#if incident.labels.includes("identified")}
							<span
								class="tag-indetified me-2 mt-1 inline-block rounded px-2.5 py-1 text-xs font-semibold uppercase leading-3"
							>
								{l(lang, "incident.identified")}
							</span>
						{/if}
						{#if incident.labels.includes("resolved")}
							<span
								class=" tag-resolved me-2 inline-block rounded px-2.5 py-1 text-xs font-semibold uppercase leading-3"
							>
								{l(lang, "incident.resolved")}
							</span>
						{/if}
						{#if incident.labels.includes("maintenance")}
							<span
								class="tag-maintenance me-2 inline-block rounded px-2.5 py-1 text-xs font-semibold uppercase leading-3"
							>
								{l(lang, "incident.maintenance")}
							</span>
						{/if}
					</p>
				</Card.Description>
			</Card.Header>
			{#if (variant.includes("body") || variant.includes("comments")) && state == "open"}
				<Card.Content class="px-14">
					{#if variant.includes("body")}
						<div
							class="prose prose-stone max-w-none dark:prose-invert prose-code:rounded prose-code:px-[0.3rem] prose-code:py-[0.2rem] prose-code:font-mono prose-code:text-sm"
						>
							{@html incident.body}
						</div>
					{/if}
					{#if variant.includes("comments") && incident.comments?.length > 0}
						<div class="ml-4 mt-8 px-4">
							<ol class="relative border-s border-secondary">
								{#each incident.comments as comment}
									<li class="mb-10 ms-4">
										<div
											class="absolute -start-1.5 mt-1.5 h-3 w-3 rounded-full border border-secondary bg-secondary"
										></div>
										<time
											class="mb-1 text-xs font-normal leading-none text-muted-foreground"
										>
											{moment(comment.created_at).format(
												"MMMM Do YYYY, h:mm:ss a"
											)}
										</time>
										<div
											class="wysiwyg prose prose-stone mb-4 max-w-none text-base font-normal dark:prose-invert prose-code:rounded prose-code:px-[0.3rem] prose-code:py-[0.2rem] prose-code:font-mono prose-code:text-sm"
										>
											{@html comment.body}
										</div>
									</li>
								{/each}
							</ol>
						</div>
					{:else if commentsLoading}
						<Skeleton class="h-[20px] w-[100px] rounded-full" />
					{/if}
				</Card.Content>
			{/if}
		</Card.Root>
	</div>
</div>

<style>
	.toggle {
		display: none;
	}
	.toggle {
		transition: all 0.15s ease-in-out;
	}
	.toggle.open {
		transform: rotate(180deg);
	}
	.incident-div:hover .toggle {
		display: block;
	}
</style>
