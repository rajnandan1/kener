<script>
    import Monitor from "$lib/components/monitor.svelte";
    import * as Card from "$lib/components/ui/card";
    import Incident from "$lib/components/incident.svelte";
    import { Separator } from "$lib/components/ui/separator";
    import { Badge } from "$lib/components/ui/badge";
    import { page } from "$app/stores";
    export let data;

    let category = data.site.categories.find((c) => c.name === $page.params.category);
    let hasActiveIncidents = data.openIncidents.length > 0;
</script>
<svelte:head>
	{#if category}
	<title>{category.name} Categorry Page</title>
	{#if category.description}
	<meta name="description" content="{category.description}" />
	{/if}
	{/if}
	
</svelte:head>
<div class="mt-32"></div>
{#if category}
<section class="mx-auto flex w-full max-w-4xl mb-8 flex-1 flex-col items-start justify-center">
    <div class="mx-auto max-w-screen-xl px-4 lg:flex lg:items-center">
        <div class="mx-auto max-w-3xl text-center blurry-bg">
            {#if category.name}
            <h1 class="bg-gradient-to-r from-green-300 via-blue-500 to-purple-600 bg-clip-text text-5xl font-extrabold text-transparent leading-snug">{category.name}</h1>
            {/if} {#if category.description}
            <p class="mx-auto mt-4 max-w-xl sm:text-xl">{category.description}</p>
            {/if}
        </div>
    </div>
</section>
{/if} {#if hasActiveIncidents}
<section class="mx-auto bg-transparent mb-4 flex w-full max-w-[890px] flex-1 flex-col items-start justify-center" id="">
    <div class="grid w-full grid-cols-2 gap-4">
        <div class="col-span-2 md:col-span-1 text-center md:text-left">
            <Badge variant="outline">Ongoing Incidents </Badge>
        </div>
    </div>
</section>
<section class="mx-auto backdrop-blur-[2px] mb-8 flex w-full max-w-[890px] flex-1 flex-col items-start justify-center" id="">
    {#each data.openIncidents as incident, i}
    <Incident {incident} state="close" variant="title+body+comments+monitor" monitor="{incident.monitor}" />
    {/each} 
</section>
{/if} {#if data.monitors.length > 0}
<section class="mx-auto bg-transparent mb-4 flex w-full max-w-[890px] flex-1 flex-col items-start justify-center" id="">
    <div class="grid w-full grid-cols-2 gap-4">
        <div class="col-span-2 md:col-span-1 text-center md:text-left">
            <Badge class="" variant="outline"> Availability per Component </Badge>
        </div>
        <div class="col-span-2 md:col-span-1 text-center md:text-right">
            <Badge variant="outline">
                <span class="w-[8px] h-[8px] inline-flex rounded-full bg-api-up opacity-75 mr-1"></span>
                <span class="mr-3">UP</span>

                <span class="w-[8px] h-[8px] inline-flex rounded-full bg-api-degraded opacity-75 mr-1"></span>
                <span class="mr-3">DEGRADED</span>

                <span class="w-[8px] h-[8px] inline-flex rounded-full bg-api-down opacity-75 mr-1"></span>
                <span class="mr-3">DOWN</span>
            </Badge>
        </div>
    </div>
</section>
<section class="mx-auto backdrop-blur-[2px] mb-8 flex w-full max-w-[890px] flex-1 flex-col items-start justify-center">
    <Card.Root class="w-full">
        <Card.Content class="p-0 monitors-card">
            {#each data.monitors as monitor}
            <Monitor {monitor} localTz="{data.localTz}" />
            {/each}
        </Card.Content>
    </Card.Root>
</section>
{:else}
<section class="mx-auto bg-transparent mb-4 flex w-full max-w-[890px] flex-1 flex-col items-start justify-center" id="">
    <Card.Root class="mx-auto">
        <Card.Content class="pt-4">
            <h1 class="scroll-m-20 text-2xl font-extrabold tracking-tight lg:text-2xl text-center">
				No Monitor Found.
			</h1>
			<p class="mt-3 text-center">
				Please read the documentation on how to add monitors 
				<a href="https://kener.ing/docs#h1add-monitors" target="_blank" class="underline">here</a>.
			</p>
        </Card.Content>
    </Card.Root>
</section>
{/if}
