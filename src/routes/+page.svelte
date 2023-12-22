<script>
    import Monitor from "$lib/components/monitor.svelte";
    import Incident from "$lib/components/incident.svelte";
	import { Separator } from "$lib/components/ui/separator";
	import { Badge } from "$lib/components/ui/badge";
    export let data;
	let hasActiveIncidents = false;
	for(let i=0; i<data.monitors.length; i++){
		if(data.monitors[i].activeIncidents.length > 0){
			hasActiveIncidents = true;
			break;
		}
	}
</script>
<div class="mt-32"></div>
{#if data.site.hero}
<section class="mx-auto flex w-full max-w-4xl mb-8 flex-1 flex-col items-start justify-center">
    <div class="mx-auto max-w-screen-xl px-4 lg:flex lg:items-center">
        <div class="mx-auto max-w-3xl text-center blurry-bg">
            {#if data.site.hero.image}
            <img src="{data.site.hero.image}" class="h-16 w-16 m-auto" alt="" srcset="" />
            {/if} {#if data.site.hero.title}
            <h1 class="bg-gradient-to-r from-green-300 via-blue-500 to-purple-600 bg-clip-text text-5xl font-extrabold text-transparent leading-snug">{data.site.hero.title}</h1>
            {/if} {#if data.site.hero.subtitle}
            <p class="mx-auto mt-4 max-w-xl sm:text-xl">{data.site.hero.subtitle}</p>
            {/if}
        </div>
    </div>
</section>
{/if}
{#if hasActiveIncidents}
<section class="mx-auto bg-transparent mb-4 flex w-full max-w-[890px] flex-1 flex-col items-start justify-center" id="">
	
	<div class="grid w-full grid-cols-2 gap-4">
		<div class="col-span-2 md:col-span-1 text-center md:text-left">
        	<Badge variant="outline">Ongoing Incidents </Badge>
		
		</div>
		</div>
</section>
<section class="mx-auto backdrop-blur-[2px] mb-8 flex w-full max-w-[890px] flex-1 flex-col items-start justify-center" id="">
    
	{#each data.monitors as monitor} {#each monitor.activeIncidents as incident, i}
        <Incident {incident} state="close" variant="title+body+comments+monitor" monitor="{monitor}" />
    {/each} {/each}
	 
</section>
{/if}

{#if data.monitors.length > 0}
<section class="mx-auto  bg-transparent mb-4 flex w-full max-w-[890px] flex-1 flex-col items-start justify-center" id="">
	<div class="grid w-full grid-cols-2 gap-4">
		<div class="col-span-2 md:col-span-1 text-center md:text-left">
        	<Badge class="" variant="outline" > Availability per Component </Badge>
		
		</div>
		<div class="col-span-2 md:col-span-1 text-center md:text-right">
			<Badge variant="outline" >
				<span class="  w-[8px] h-[8px] inline-flex   rounded-full bg-api-up opacity-75 mr-1"></span>
				<span class="mr-3">UP</span>

				<span class="  w-[8px] h-[8px] inline-flex   rounded-full bg-api-degraded opacity-75 mr-1"></span>
				<span class="mr-3">DEGRADED</span>

				<span class="  w-[8px] h-[8px] inline-flex   rounded-full bg-api-down opacity-75 mr-1"></span>
				<span class="mr-3">DOWN</span>
				
			</Badge>
		</div>
	</div>
	
</section>

{#each data.monitors as monitor}
<Monitor {monitor} />
{/each}
{/if}

