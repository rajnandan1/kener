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


     

    export let monitor;

    let _0Day = monitor.pageData._0Day;
    let _90Day = monitor.pageData._90Day;
    let uptime0Day = monitor.pageData.uptime0Day;
    let uptime90Day = monitor.pageData.uptime90Day;
    let dailyUps = monitor.pageData.dailyUps;
    let dailyDown = monitor.pageData.dailyDown;
    let dailyDegraded = monitor.pageData.dailyDegraded;

    let loading90 = false;
    let todayDD = Object.keys(_90Day)[Object.keys(_90Day).length - 1];
    let view = "90day";

     
    

    function switchView(s) {
        view = s;
    }


    onMount(async () => {
    });
</script>
<section class="mx-auto backdrop-blur-[2px]  mb-8 flex w-full max-w-[890px] flex-1 flex-col items-start justify-center">
    <Card.Root class="w-full">
        <Card.Content class="pb-0">
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
								<HoverCard.Content class="dark:invert">
									{monitor.description}
								</HoverCard.Content>
							</HoverCard.Root>
							{/if}
						</div>
					</div>
					{#if !loading90}
					<div class="mt-2">
						<div class="grid grid-cols-2 gap-0">
							<div class="col-span-2">
								<span class="inline-flex text-muted-foreground     text-sm">
									90 Day Uptime: {uptime90Day}% 
								</span>
							</div>
							<div class="col-span-2">
								
								<span class="inline-flex  text-muted-foreground   text-sm">
									Today Uptime: {uptime0Day}% 
								</span>
							</div>
							<div class="col-span-2 -mt-2">
								<a href="/incident/{monitor.folderName}#past_incident" class="pt-0 pl-0 pb-0 text-indigo-500 text-left {buttonVariants({ variant: 'link' })}">
									Recent Incidents <ArrowRight size="{16}" />
								</a>
							</div>
						</div>
					</div>
					{/if}
				</div>
				<div class="col-span-12 md:col-span-8 pt-2">
					{#if loading90}
						<Skeleton class="w-full h-[40px] mt-[7px]" />
					{:else}
						<div class="grid grid-cols-12 ">
							<div class="col-span-12 md:col-span-4 mt-2 h-[32px]">
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
							<div class="col-span-12 md:col-span-8 text-right h-[32px]">
								{#if _90Day[todayDD]}
								<div class="text-api-up text-sm font-semibold mt-[8px] text-{_90Day[todayDD].cssClass}">
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
												● {new Date(bar.timestamp * 1000).toLocaleDateString()} {bar.message}
												{:else}
												● {new Date(bar.timestamp * 1000).toLocaleDateString()} {bar.message}
												{/if}
											</div>
										</div>
										{/each}
									</div>
								 </div>
							{:else}
								<div class="chart-status relative mt-1 mb-4 col-span-12">
									<div class="flex flex-wrap today-sq-div ">
										{#each Object.entries(_0Day) as [ts, bar] }
										<div data-index="{bar.index}" class="h-[10px] bg-{bar.cssClass} w-[10px] today-sq m-[1px]" >
											
										</div>
										<div class="hiddenx relative">
											<div data-index="{ts.index}"  class="  p-2 text-sm   rounded font-semibold message bg-black text-white border ">
												<p><span class="text-{bar.cssClass}">●</span> {new Date(bar.timestamp * 1000).toLocaleTimeString()}</p>
												{#if bar.status != 'NO_DATA'}
												<p class="pl-4">{bar.status}</p>
												{:else}
												<p class="pl-4">-</p>
												{/if}
											</div>
										</div>
										{/each}
									</div>
								</div>
							{/if}

							
						</div>	
					{/if} 
				</div>
			</div>

            
        </Card.Content>
    </Card.Root>
</section>