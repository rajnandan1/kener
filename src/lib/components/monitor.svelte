<script>
    import * as Card from "$lib/components/ui/card";
    import { Badge } from "$lib/components/ui/badge";
    import * as HoverCard from "$lib/components/ui/hover-card";
    import { Separator } from "$lib/components/ui/separator";
    import { onMount } from "svelte";
    import { Skeleton } from "$lib/components/ui/skeleton";
    import { Button } from "$lib/components/ui/button";
    import moment from "moment-timezone";
    import axios from "axios";
    import { ArrowDown, ArrowUp, ArrowRight, BadgeCheck, Dot } from "lucide-svelte";
    import { buttonVariants } from "$lib/components/ui/button";
    import * as Alert from "$lib/components/ui/alert";

    export let monitor;
    let loading90 = true;
	let todayDD = moment().format("YYYY-MM-DD")
    let uptime90Day = "0";
    let uptime0Day = "0";
    let dailyUps = 0;
    let dailyDown = 0;
    let dailyDegraded = 0;
	let avgLatency90Day = 0;
	let avgLatency0Day = 0;
    let view = "90day";
    let _0Day = {};
    let _90Day = {};
    let statusObj = {
        UP: "api-up",
        DEGRADED: "api-degraded",
        DOWN: "api-down",
        NO_DATA: "api-nodata",
    };

    const now = moment();
    let minuteFromMidnightTillNow = now.diff(now.clone().startOf("day"), "minutes");

     
    function switchView(s) {
        view = s;
    }
     

    const fetchFromFile = async function (day0File, day90File) {
        //use axios to call POST /api/today
        let options = {
            method: "POST",
            url: "/api/today",
            headers: {
                "Content-Type": "application/json",
            },
            data: {
                day0: day0File,
				tz: moment.tz.guess()
            },
        };
        let res = await axios(options);
        const day90 = res.data.day90;
		_0Day = res.data._0Day;
		_90Day = res.data._90Day;
		uptime0Day = res.data.uptime0Day;
		uptime90Day = res.data.uptime90Day;
		avgLatency90Day = res.data.avgLatency90Day;
		avgLatency0Day = res.data.avgLatency0Day;
		dailyUps = res.data.dailyUps;
		dailyDown = res.data.dailyDown;
		dailyDegraded = res.data.dailyDegraded;

		

        loading90 = false;
    };

    onMount(async () => {
        fetchFromFile(monitor.path0Day, monitor.path90Day);
    });
</script>

<section class="mx-auto backdrop-blur-[2px] mb-8 flex w-full max-w-[770px] flex-1 flex-col items-start justify-center">
    <Card.Root class="w-full">
        <Card.Header>
            <div class="grid grid-cols-3 gap-4">
                <div class="col-span-3 md:col-span-2 relative {!!monitor.image?'pl-11':''}">
					{#if monitor.image}
					<img src="{monitor.image}" class="w-8 h-8 left-0 top-[1px] absolute" alt="" srcset="">
					{/if}
                    <Card.Title>
						{monitor.name}
					</Card.Title>
					{#if monitor.description}
                    <Card.Description class="mt-1">
						{monitor.description}
					</Card.Description>
					{/if}
                </div>
                <div class="col-span-3 md:col-span-1 md:text-right">
                    {#if monitor.hasActiveIncident}
                    <a href="incident/{monitor.folderName}">
                        
						<a href="/incident/{monitor.folderName}#active_incident" class="{buttonVariants({ variant: "outline" })} relative">
							<span class="animate-ping absolute -right-[2px] -top-[2px] w-[8px] h-[8px] inline-flex rounded-full h-3 w-3 bg-red-500 opacity-75"></span>
                            Ongoing Incident
						</a>
                    </a>
                    {:else if _90Day[todayDD] && _90Day[todayDD].cssClass == statusObj.DOWN}
						<p class="text-destructive mt-3 text-sm font-semibold">
							Down for {_90Day[todayDD].DOWN} minutes
						</p>
					{/if}
                </div>
            </div>
        </Card.Header>
        <Separator class="mb-4 mt-1" />
        <Card.Content>
            <div class="grid grid-cols-3   gap-4 mb-4">
                <div class="col-span-3  sm:col-span-2 text-left">
                    <Button class="h-9 px-4 py-2 w-48 rounded-full sm:w-auto" variant="{view != '90day' ? 'ghost' : ''}" on:click="{(e) => {switchView('90day')}}">90 Day</Button>
                    <Button class="h-9 px-4 py-2 w-48 rounded-full sm:w-auto" variant="{view != '0day' ? 'ghost' : ''}" on:click="{(e) => {switchView('0day')}}">Today</Button>
                </div>
                <div class="col-span-3 sm:col-span-1 sm:text-right">
                
					<a href="/incident/{monitor.folderName}#past_incident" class={buttonVariants({ variant: "ghost" })}>
						Past Incidents <ArrowRight size="{16}" />
					</a>
                </div>
            </div>

            {#if view == "90day"}
            <div>
                {#if loading90}
                <Skeleton class="w-[720px] h-[40px] mt-4" />
                {:else}
                <div class="uptime90Day text-sm font-semibold mb-1 text-center">
					Uptime for 90 Day is {uptime90Day}% / {avgLatency90Day} ms AVG latency
				</div>
                <div class="chart-status relative">
                    <div class="flex flex-wrap">
                        {#each Object.entries(_90Day) as [ts, bar]}
                        <div class="h-[40px] w-[8px] rounded-sm oneline">
                            <div class="h-[40px] bg-{bar.cssClass} w-[6px] rounded-sm mr-[2px]"></div>
                        </div>
                        <div class="absolute show-hover text-sm bg-background">
                            <div class="bgg-{bar.cssClass}">{bar.timestamp} / {bar.message} / {bar.uptimePercentage}% up / {bar.avgLatency} ms AVG latency</div>
                        </div>
                        {/each}
                    </div>
                </div>
                {/if}
            </div>
            {:else}
            <div class="uptime90Day mb-1 text-sm font-semibold text-center">
                Uptime for today is {uptime0Day}% / {avgLatency0Day} ms AVG latency
            </div>
            <div class="flex flex-wrap today-sq-div mt-[45px]">
                {#each Object.entries(_0Day) as [ts, bar] }
                <div data-index="{bar.index}" class="h-[10px] bg-{bar.cssClass} w-[10px] today-sq m-[1px]" >
                    
					{#if bar.index == 0}
                    <div class="arrow start text-sm">
                        Midnight
                        <ArrowDown size="{16}" />
                    </div>
                    {/if} {#if bar.index == minuteFromMidnightTillNow}
                    <div class="arrow end text-sm">
                        <ArrowUp size="{16}" />
                        Now
                    </div>
                    {/if}
                </div>
				<div class="hidden relative">
					<div data-index="{bar.index}"  class="w-[300px]  pb-2 pr-1 pl-1 text-sm text-center rounded font-semibold message bg-indigo-600 text-yellow-50">
						<span class="text-{bar.cssClass} text-2xl">•</span> {bar.timestamp} / {bar.status} / {bar.latency} ms
					</div>
				</div>
				
				
                {/each}
            </div>
            {/if}
        </Card.Content>
    </Card.Root>
</section>
