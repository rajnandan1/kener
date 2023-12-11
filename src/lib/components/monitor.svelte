<script>
    import * as Card from "$lib/components/ui/card";
    import { Badge } from "$lib/components/ui/badge";
    import * as HoverCard from "$lib/components/ui/hover-card";
    import { Separator } from "$lib/components/ui/separator";
    import { onMount } from "svelte";
    import { Skeleton } from "$lib/components/ui/skeleton";
    import { Button } from "$lib/components/ui/button";
    import axios from "axios";
    import { ArrowDown, ArrowUp, ArrowRight, BadgeCheck, Dot, PackageCheck, Check, BadgeInfo } from "lucide-svelte";
    import { buttonVariants } from "$lib/components/ui/button";
    import * as Alert from "$lib/components/ui/alert";

	function getTodayDD() {

		let yourDate = new Date();

		const offset = yourDate.getTimezoneOffset()
		yourDate = new Date(yourDate.getTime() - (offset*60*1000))
		return yourDate.toISOString().split('T')[0]
	}

	function getminuteFromMidnightTillNow() {
		var date = new Date();
		var hours = date.getHours();
		var minutes = date.getMinutes();
		var totalMinutes = (hours*60) + minutes ;
		return totalMinutes
	}

    export let monitor;
    let loading90 = true;
	let todayDD = getTodayDD();
	
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

    let minuteFromMidnightTillNow = getminuteFromMidnightTillNow();

     
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
				day90: day90File,
				tz: Intl.DateTimeFormat().resolvedOptions().timeZone
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

<section class="mx-auto backdrop-blur-[2px]  mb-8 flex w-full max-w-[890px] flex-1 flex-col items-start justify-center">
    <Card.Root class="w-full">
        <Card.Content>
			<div class="grid grid-cols-12 gap-4">
				<div class="col-span-12 md:col-span-4">
					<div class="pt-3">
						<div class="scroll-m-20 text-2xl font-semibold tracking-tight">
							{#if monitor.image}
							<img src="{monitor.image}" class="w-6 h-6 inline" alt="" srcset="">
							{/if}
							{monitor.name} 
							{#if monitor.description}
							<HoverCard.Root>
								<HoverCard.Trigger>
									<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide inline lucide-info"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
								</HoverCard.Trigger>
								<HoverCard.Content>
									{monitor.description}
								</HoverCard.Content>
							</HoverCard.Root>
							{/if}
						</div>
					</div>
					{#if !loading90}
					<div class="mt-2">
						
						
						{#if view == "90day"}
						<p class="text-sm text-muted-foreground">
							90 Day
						</p>
						
						<span class="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
							{uptime90Day}% Uptime
						</span>
						<span class="inline-flex items-center rounded-md bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-700/10">
							{avgLatency90Day}ms Latency
						</span>
						{:else}
						<p class="text-sm text-muted-foreground ">
							Today
						</p>
						<span class="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
							{uptime0Day}% Uptime
						</span>
						<span class="inline-flex items-center rounded-md bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-700/10">
							{avgLatency0Day}ms Latency	
						</span>
						{/if}
					</div>
					{/if}
				</div>
				<div class="col-span-12 md:col-span-8 pt-4">
					{#if loading90}
						<Skeleton class="w-full h-[40px] mt-[7px]" />
					{:else}
						<div class="grid grid-cols-12 ">
							<div class="col-span-12 md:col-span-4 mt-2 h-[38px]">
								<a href="javascript:void(0);" on:click="{(e) => {switchView('90day')}}">
									<Badge variant="{view != '90day' ? 'outline' : ''}">
										90 Day
									</Badge>
								</a>
								<a href="javascript:void(0);" on:click="{(e) => {switchView('0day')}}">
									<Badge variant="{view != '0day' ? 'outline' : ''}" >
										Today
									</Badge> 
								</a>
								
							</div>
							<div class="col-span-12 md:col-span-8 text-right h-[38px]">

								{#if monitor.hasActiveIncident}
								<a href="/incident/{monitor.folderName}#active_incident" class="{buttonVariants({ variant: "outline" })} relative">
									<span class="animate-ping absolute -right-[2px] -top-[2px] w-[8px] h-[8px] inline-flex rounded-full bg-red-500 opacity-75"></span>
                        			Ongoing Incident
								</a>
								{:else if _90Day[todayDD]}
									<div class="text-api-up text-sm font-semibold mt-[12px] text-{_90Day[todayDD].cssClass}">
										{_90Day[todayDD].message}
									</div>
								{/if}
							</div>
						</div>	
						<div class="grid grid-cols-12">
							{#if view == "90day"}
								 <div class="chart-status relative mt-1 col-span-12">
									<div class="flex flex-wrap">
										{#each Object.entries(_90Day) as [ts, bar]}
										<div class="h-[30px] w-[6px] rounded-sm oneline">
											<div class="h-[30px] bg-{bar.cssClass} w-[4px] rounded-sm mr-[2px]"></div>
										</div>
										<div class="absolute show-hover text-sm bg-background">
											<div class="text-{bar.cssClass} font-semibold" >
												{#if bar.message != "No Data"}
												{new Date(bar.timestamp).toLocaleDateString()} ● {bar.message} ● {bar.avgLatency} ms AVG latency
												{:else}
												{new Date(bar.timestamp).toLocaleDateString()} ● {bar.message}
												{/if}
											</div>
										</div>
										{/each}
									</div>
								 </div>
							{:else}
								<div class="chart-status relative mt-1 col-span-12">
									<div class="flex flex-wrap today-sq-div ">
										{#each Object.entries(_0Day) as [ts, bar] }
										<div data-index="{bar.index}" class="h-[10px] bg-{bar.cssClass} w-[10px] today-sq m-[1px]" >
											
										</div>
										<div class="hiddenx relative">
											<div data-index="{bar.index}"  class="  p-2 text-sm   rounded font-semibold message bg-black text-white border ">
												<p><span class="text-{bar.cssClass}">●</span> {new Date(bar.timestamp).toLocaleString()}</p>
												{#if bar.status != 'NO_DATA'}
												<p class="pl-4">{bar.status} / {bar.latency}ms</p>
												{:else}
												<p class="pl-4">-</p>
												{/if}
											</div>
										</div>
										{/each}
									</div>
								</div>
							{/if}

							<div class="col-span-12 text-right ">
								<a href="/incident/{monitor.folderName}#past_incident" class="-mr-4 {buttonVariants({ variant: 'link' })}">
									Past Incidents <ArrowRight size="{16}" />
								</a>
							</div>
						</div>	
					{/if} 
				</div>
			</div>

            
        </Card.Content>
    </Card.Root>
</section>
