<script>
    import * as Card from "$lib/components/ui/card";
	
    import Incident from "$lib/components/incident.svelte";
    export let data;
    import { Separator } from "$lib/components/ui/separator";
    import moment from "moment";
    import { Badge } from "$lib/components/ui/badge";
    import { ArrowDown, ArrowUp, ChevronUp, BadgeCheck, ChevronDown } from "lucide-svelte";
    import * as Collapsible from "$lib/components/ui/collapsible";

</script>
<svelte:head>
	<title>
		{data.monitor.name} - Incidents
	</title>
</svelte:head>
<section class="mx-auto flex w-full max-w-4xl flex-1 flex-col items-start justify-center">
    <div class="mx-auto max-w-screen-xl px-4 pt-32 pb-16 lg:flex lg:items-center">
        <div class="mx-auto max-w-3xl text-center blurry-bg">
            <h1 class="bg-gradient-to-r from-green-300 via-blue-500 to-purple-600 bg-clip-text text-5xl font-extrabold text-transparent leading-snug">{data.monitor.name}</h1>

            <p class="mx-auto mt-4 max-w-xl sm:text-xl">{@html data.monitor.description}</p>
        </div>
    </div>
</section>
<section class="mx-auto flex-1 mt-8 flex-col mb-4 flex w-full" >
    <div class="container">
        <h1 class="mb-4 text-2xl font-bold leading-none">
            <Badge variant="outline"> Active Incidents</Badge>
        </h1>

        {#if data.activeIncidents.length > 0} 
		{#each data.activeIncidents as incident, i}
		
        <Incident {incident} state = "{i==0?'open':'close'}" variant="title+body+comments" monitor="{data.monitor}" />
        {/each} 
		{:else}
        <div class="flex items-center justify-left">
            <p class="text-base font-semibold">No active incidents</p>
        </div>
        {/if}
    </div>
</section>
<Separator class="container mb-4 w-[400px]" />
<section class="mx-auto flex-1 mt-8 flex-col mb-4 flex w-full" >
    <div class="container">
        <h1 class="mb-4 text-2xl font-bold leading-none">
            <Badge variant="outline"> Recent Incidents  - Last {data.site.github.incidentSince} Hours </Badge>
        </h1>

        {#if data.pastIncidents.length > 0} 
		{#each data.pastIncidents as incident}
        <Incident {incident} state="close" variant="title+body+comments" monitor="{data.monitor}" />
        {/each} 
		{:else}
        <div class="flex items-center justify-left">
            <p class="text-base font-semibold">No recent incidents</p>
        </div>
        {/if}
    </div>
</section>