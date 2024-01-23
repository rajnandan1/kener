<script>
    import * as Card from "$lib/components/ui/card";
    import { Separator } from "$lib/components/ui/separator";
    import * as HoverCard from "$lib/components/ui/hover-card";
	import {StatusObj} from "$lib/helpers.js";
    import moment from "moment";
    import { Button } from "$lib/components/ui/button";
    import { Badge } from "$lib/components/ui/badge";
    import { ArrowDown, ArrowUp, ChevronUp, BadgeCheck, ChevronDown } from "lucide-svelte";
    import * as Collapsible from "$lib/components/ui/collapsible";
    export let incident;
    export let variant = "title+body+comments+monitor";
    export let state = "open";
    export let monitor;
	let blinker = "bg-transparent"
	let incidentPriority = ""
	if(incident.labels.includes("incident-down")){
		blinker = "bg-red-500";
		incidentPriority = "DOWN"
	} else if(incident.labels.includes("incident-degraded")){
		blinker = "bg-yellow-500"
		incidentPriority = "DEGRADED"
	}
	let incidentState = incident.state;
	let incidentClosedAt = incident.incident_end_time;
	let incidentCreatedAt = incident.incident_start_time;
	let incidentMessage = "";
	if(!!incidentClosedAt && !!incidentCreatedAt){
		//diff between closed_at and created_at
		let diff = moment(incidentClosedAt * 1000).add(1, "minutes").diff(moment(incidentCreatedAt * 1000), 'minutes');

		if(diff > 0) {
			incidentMessage = `. Was <span class="text-${StatusObj[incidentPriority]}">${incidentPriority}</span>  for ${diff} minutes`;
		}
		
	} else if(!!incidentCreatedAt){
		//diff between now and created_at
		let diff = moment().diff(moment(incidentCreatedAt * 1000), 'minutes');
		incidentMessage = `. Has been <span class="text-${StatusObj[incidentPriority]}">${incidentPriority}</span> for ${diff} minutes`;
	}

	//find a replace /\[start_datetime:(\d+)\]/ empty  in incident.body
	//find a replace /\[end_datetime:(\d+)\]/ empty  in incident.body
	incident.body = incident.body.replace(/\[start_datetime:(\d+)\]/g, "");
	incident.body = incident.body.replace(/\[end_datetime:(\d+)\]/g, "");
</script>

<div class="grid grid-cols-3 gap-4 mb-4 w-full">
    <div class="col-span-3">
        <Card.Root>
            
            <Card.Header>
                <Card.Title class="relative">
					{#if variant.includes("monitor")}
                    <div class="pb-4">
                        <div class="scroll-m-20 text-2xl font-semibold tracking-tight">
                            {#if monitor.image}
                            <img src="{monitor.image}" class="w-6 h-6 inline" alt="" srcset="" />
                            {/if} 
							{monitor.name} 
							{#if monitor.description}
                            <HoverCard.Root>
                                <HoverCard.Trigger>
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        width="16"
                                        height="16"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        stroke-width="2"
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        class="lucide inline lucide-info"
                                    >
                                        <circle cx="12" cy="12" r="10" />
                                        <path d="M12 16v-4" />
                                        <path d="M12 8h.01" />
                                    </svg>
                                </HoverCard.Trigger>
                                <HoverCard.Content class="dark:invert"> 
									{monitor.description} 
								</HoverCard.Content>
                            </HoverCard.Root>
                            {/if}
                        </div>
                    </div>
					{/if}
					{#if variant.includes("title")}
                    {incident.title}
					{/if}

					{#if incidentState == 'open'}
                    <span class="animate-ping absolute -left-[24px] -top-[24px] w-[8px] h-[8px] inline-flex rounded-full {blinker} opacity-75"></span>
                    {/if}
					
					{#if variant.includes("body") || variant.includes("comments")} {#if state == "close"}
                    <Button variant="outline" class="absolute right-0" size="icon" on:click="{(e) => {state = 'open'}}">
                        <ChevronDown class="" size="{32}" />
                    </Button>
                    {:else}
                    <Button variant="outline" class="absolute right-0" size="icon" on:click="{(e) => {state = 'close'}}">
                        <ChevronUp class="" size="{32}" />
                    </Button>

                    {/if} {/if}
                </Card.Title>
                <Card.Description> 
					{moment(incidentCreatedAt  * 1000).format("MMMM Do YYYY, h:mm:ss a")} 
					{@html incidentMessage}
					<p class="mt-2">
						{#if incident.labels.includes("identified")}
						<span class="bg-yellow-100 text-yellow-800 mt-1 text-sm font-medium me-2 px-2.5 py-0.5 rounded dark:bg-yellow-900 dark:text-yellow-300">Identified</span>
						{/if}
						{#if incident.labels.includes("resolved")}
						<span class="bg-green-100 text-green-800 text-sm font-medium me-2 px-2.5 py-0.5 rounded dark:bg-green-900 dark:text-green-300">Resolved</span>
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
                {/if} {#if variant.includes("comments") && incident.comments.length > 0}
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
                {/if}
            </Card.Content>
            {/if}
        </Card.Root>
    </div>
</div>
