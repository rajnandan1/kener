<script>
    import * as Card from "$lib/components/ui/card";
    import { Badge } from "$lib/components/ui/badge";
    import * as HoverCard from "$lib/components/ui/hover-card";
    import { Separator } from "$lib/components/ui/separator";
    import { onMount } from "svelte";
    import { Button } from "$lib/components/ui/button";
    import { ArrowRight } from "lucide-svelte";
    import { buttonVariants } from "$lib/components/ui/button";
    import { Skeleton } from "$lib/components/ui/skeleton";
    import axios from "axios";

    export let monitor;
    export let localTz;

    let _0Day = {};
    let _90Day = monitor.pageData._90Day;
    let uptime0Day = monitor.pageData.uptime0Day;
    let uptime90Day = monitor.pageData.uptime90Day;
    let dailyUps = monitor.pageData.dailyUps;
    let dailyDown = monitor.pageData.dailyDown;
    let dailyDegraded = monitor.pageData.dailyDegraded;

    let todayDD = Object.keys(_90Day)[Object.keys(_90Day).length - 1];
    let view = "90day";

    function getToday() {
        //axios post using options application json
        setTimeout(() => {
            axios
                .post("/api/today", {
                    monitor: monitor,
                    localTz: localTz,
                })
                .then((response) => {
                    if (response.data) {
                        _0Day = response.data;
                    }
                })
                .catch((error) => {
                    console.log(error);
                });
        }, 1000 * 1);
    }

	function scrollToRight() {
		setTimeout(() => {
			let divs = document.querySelectorAll(".daygrid90");
			divs.forEach((div) => {
				div.scrollLeft = div.scrollWidth;
			});
		}, 1000 * .2);
	}
    function switchView(s) {
        view = s;
        if (Object.keys(_0Day).length == 0) {
            getToday();
        }
		if (view == '90day') {
			scrollToRight();
		}
    }

    onMount(async () => {
        //getToday();
        //for each div with class 90daygrid scroll to right most
        scrollToRight()
    });
</script>
<div class="grid grid-cols-12 gap-4 monitor pb-4">
    <div class="col-span-12 md:col-span-4">
        <div class="pt-1">
            <div class="scroll-m-20 text-2xl font-semibold tracking-tight">
                {#if monitor.image}
                <img src="{monitor.image}" class="w-6 h-6 inline" alt="{monitor.name}" srcset="" />
                {/if} {monitor.name} {#if monitor.description}
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
                    <HoverCard.Content class="dark:invert"> {monitor.description} </HoverCard.Content>
                </HoverCard.Root>
                {/if}
            </div>
        </div>
        <div class="mt-2">
            <div class="grid grid-cols-2 gap-0">
                <div class="col-span-2 -mt-2">
                    <a href="/incident/{monitor.folderName}#past_incident" class="pt-0 pl-0 pb-0 text-indigo-500 text-left {buttonVariants({ variant: 'link' })}">
                        Recent Incidents <ArrowRight size="{16}" />
                    </a>
                </div>
            </div>
        </div>
    </div>
    <div class="col-span-12 md:col-span-8 pt-2">
        <div class="grid grid-cols-12">
            <div class="col-span-12 md:col-span-8 h-[32px]">
                <button class="inline-block" on:click="{(e) => {switchView('90day')}}">
                    <Badge variant="{view != '90day' ? 'outline' : ''}"> 90 Day ► {uptime90Day}% </Badge>
                </button>
                <button on:click="{(e) => {switchView('0day')}}">
                    <Badge variant="{view != '0day' ? 'outline' : ''}"> Today ► {uptime0Day}% </Badge>
                </button>
            </div>
            <div class="col-span-12 md:col-span-4 text-right h-[32px]">
                {#if _90Day[todayDD]}
                <div class="text-api-up md:pr-6 text-sm font-semibold mt-[4px] text-{_90Day[todayDD].cssClass}">{_90Day[todayDD].message}</div>
                {/if}
            </div>
        </div>
        <div class="grid grid-cols-12">
            {#if view == "90day"}
            <div class="chart-status relative mt-1 col-span-12">
                <div class="flex overflow-x-auto daygrid90 overflow-y-hidden">
                    {#each Object.entries(_90Day) as [ts, bar]}
                    <div class="h-[30px] w-[6px] rounded-sm oneline">
                        <div class="h-[30px] bg-{bar.cssClass} w-[4px] rounded-sm mr-[2px]"></div>
                    </div>
                    <div class="absolute show-hover text-sm bg-background">
                        <div class="text-{bar.cssClass} font-semibold">
                            {#if bar.message != "No Data"} ● {new Date(bar.timestamp * 1000).toLocaleDateString()} {bar.message} {:else} ● {new Date(bar.timestamp * 1000).toLocaleDateString()}
                            {bar.message} {/if}
                        </div>
                    </div>
                    {/each}
                </div>
            </div>
            {:else}
            <div class="chart-status relative mt-1 mb-4 col-span-12">
                <div class="flex flex-wrap today-sq-div">
                    {#if Object.keys(_0Day).length == 0}
                    <Skeleton class="w-full h-[20px] mr-1 rounded-full" />
                    {/if} {#each Object.entries(_0Day) as [ts, bar] }
                    <div data-index="{bar.index}" class="h-[10px] bg-{bar.cssClass} w-[10px] today-sq m-[1px]"></div>
                    <div class="hiddenx relative">
                        <div data-index="{ts.index}" class="p-2 text-sm rounded font-semibold message bg-black text-white border">
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
    </div>
</div>
<style>
	.daygrid90 {
    -ms-overflow-style: none;  /* Internet Explorer 10+ */
    scrollbar-width: none;  /* Firefox */
}
.daygrid90::-webkit-scrollbar { 
    display: none;  /* Safari and Chrome */
}
</style>