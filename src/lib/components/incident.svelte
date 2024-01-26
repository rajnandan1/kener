<script>
    import * as Card from "$lib/components/ui/card";
    import { Separator } from "$lib/components/ui/separator";
    import { StatusObj } from "$lib/helpers.js";
    import moment from "moment";
    import { Button } from "$lib/components/ui/button";
    import { Badge } from "$lib/components/ui/badge";
    import {  ChevronDown } from "lucide-svelte";
    import * as Collapsible from "$lib/components/ui/collapsible";
	import axios from "axios";
	import { Skeleton } from "$lib/components/ui/skeleton";
    export let incident;
    export let variant = "title+body+comments+monitor";
    export let state = "open";
    export let monitor;
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
	let commentsLoading = true

	function getComments(){
		state = (state=='open'? 'close':'open');
		if(incident.comments.length > 0) return;
		if(commentsLoading === false) return;
		axios.get(`/incident/${incident.number}/comments`).then((response) => {
			incident.comments = response.data;
			commentsLoading = false;
		}).catch((error) => {
			// console.log(error);
		});
	}
	
</script>

<div class="grid grid-cols-3 gap-4 mb-8 w-full incident-div">
    <div class="col-span-3">
        <Card.Root>
            <Card.Header>
                <Card.Title class="relative">
					{#if incidentPriority != "" && incidentDuration > 0}
                    <p class="leading-10 absolute -top-11 -translate-y-1">
                        <Badge class="text-[rgba(0,0,0,.6)] -ml-3 bg-card text-sm font-semibold text-{StatusObj[incidentPriority]} "> {incidentPriority} for {incidentDuration} Minute{incidentDuration > 1 ? "s" : ""} </Badge>
                    </p>

                    {/if}
                    {#if variant.includes("monitor")}
                    <div class="pb-4">
                        <div class="scroll-m-20 text-2xl font-semibold tracking-tight">
                            {#if monitor.image}
                            <img src="{monitor.image}" class="w-6 h-6 inline" alt="" srcset="" />
                            {/if} {monitor.name} 
							
                        </div>
                    </div>
                    {/if} {#if variant.includes("title")} {incident.title} {/if} 
					{#if incidentState == 'open'}
                    <span class="animate-ping absolute -left-[24px] -top-[24px] w-[8px] h-[8px] inline-flex rounded-full {blinker} opacity-75"></span>
                    {/if}
					{#if variant.includes("body") || variant.includes("comments")}
                    <div class="absolute right-4 toggle {state}">
                        <Button variant="outline" class="rounded-full" size="icon" on:click="{getComments}">
                            <ChevronDown class="text-muted-foreground" size="{24}" />
                        </Button>
                    </div>
                    {/if}
                </Card.Title>
                <Card.Description>
                    {moment(incidentCreatedAt * 1000).format("MMMM Do YYYY, h:mm:ss a")} 
					

                    <p class="mt-2 leading-8">
                        {#if incident.labels.includes("identified")}
                        <span class="mt-1 text-xs font-semibold me-2 px-2.5 py-1 uppercase leading-3 inline-block  rounded tag-indetified">Identified</span>
                        {/if} {#if incident.labels.includes("resolved")}
                        <span class=" text-xs font-semibold me-2 px-2.5 py-1 leading-3 inline-block rounded uppercase tag-resolved">Resolved</span>
                        {/if} {#if incident.labels.includes("maintenance")}
                        <span class="text-xs font-semibold me-2 px-2.5 py-1 leading-3 inline-block rounded uppercase tag-maintenance">
							Maintenance
						</span>
                        {/if}
                    </p>
                </Card.Description>
            </Card.Header>
            {#if (variant.includes("body") || variant.includes("comments")) && state == "open"}
            <Card.Content>
                {#if variant.includes("body")}
                <div class="prose prose-stone dark:prose-invert max-w-none prose-code:px-[0.3rem] prose-code:py-[0.2rem] prose-code:font-mono prose-code:text-sm prose-code:rounded">
                    {@html incident.body}
                </div>
                {/if} 
				{#if variant.includes("comments") && incident.comments?.length > 0}
                <div class="ml-4 mt-8">
                    <ol class="relative border-s border-secondary">
                        {#each incident.comments as comment}
                        <li class="mb-10 ms-4">
                            <div class="absolute w-3 h-3 rounded-full mt-1.5 -start-1.5 border bg-secondary border-secondary"></div>
                            <time class="mb-1 text-sm font-normal leading-none text-muted-foreground"> {moment(comment.created_at).format("MMMM Do YYYY, h:mm:ss a")} </time>
                            <div
                                class="mb-4 text-base font-normal wysiwyg dark:prose-invert prose prose-stone max-w-none prose-code:px-[0.3rem] prose-code:py-[0.2rem] prose-code:font-mono prose-code:text-sm prose-code:rounded"
                            >
                                {@html comment.body}
                            </div>
                        </li>
                        {/each}
                    </ol>
                </div>
				{:else if commentsLoading}
					<Skeleton class="w-[100px] h-[20px] rounded-full" />
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
	.toggle{
		transition: all 0.15s ease-in-out;
	}
	.toggle.open{
		transform: rotate(180deg);
	}
    .incident-div:hover .toggle {
        display: block;
    }
</style>
