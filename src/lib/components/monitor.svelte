<script>
    import * as Card from "$lib/components/ui/card";
    import { Badge } from "$lib/components/ui/badge";
    import * as Popover from "$lib/components/ui/popover";
    import { Separator } from "$lib/components/ui/separator";
    import { onMount } from "svelte";
    import { Button } from "$lib/components/ui/button";
    import { ArrowRight, Share2, Info, Link, CopyCheck, Code, TrendingUp, Percent } from "lucide-svelte";
    import { buttonVariants } from "$lib/components/ui/button";
    import { Skeleton } from "$lib/components/ui/skeleton";
    import { createEventDispatcher } from "svelte";
    import { beforeUpdate, afterUpdate } from "svelte";
    import * as RadioGroup from "$lib/components/ui/radio-group";
    import { Label } from "$lib/components/ui/label";
    const dispatch = createEventDispatcher();
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
    let theme = "light";
    let embedType = "js";
    let todayDD = Object.keys(_90Day)[Object.keys(_90Day).length - 1];
    let view = "90day";
    let copiedLink = false;
    let copiedEmbed = false;
    let copiedBadgeStatus = false;
    let copiedBadgeUptime = false;

    function copyLinkToClipboard() {
        let link = window.location.href;
        //get domain with port number
        let domain = window.location.host;
        //get protocol
        let protocol = window.location.protocol;
        let path = "/monitor-" + monitor.tag;
        navigator.clipboard.writeText(protocol + "//" + domain + path);
        copiedLink = true;
        setTimeout(function () {
            copiedLink = false;
        }, 1500);
    }
    function copyUptimeBadge() {
        let link = window.location.href;
        let domain = window.location.host;
        let protocol = window.location.protocol;
        let path = `/badge/${monitor.tag}/uptime`;
        navigator.clipboard.writeText(protocol + "//" + domain + path);
        copiedBadgeUptime = true;
        setTimeout(function () {
            copiedBadgeUptime = false;
        }, 1500);
    }
    function copyStatusBadge() {
        let link = window.location.href;
        let domain = window.location.host;
        let protocol = window.location.protocol;
        let path = `/badge/${monitor.tag}/status`;
        navigator.clipboard.writeText(protocol + "//" + domain + path);
        copiedBadgeStatus = true;
        setTimeout(function () {
            copiedBadgeStatus = false;
        }, 1500);
    }

    function copyScriptTagToClipboard() {
        let link = window.location.href;
        //get domain with port number
        let domain = window.location.host;
        //get protocol
        let protocol = window.location.protocol;
        let path = "/embed-" + monitor.tag;
        let scriptTag = `<script async src="${protocol + "//" + domain + path}/js?theme=${theme}&monitor=${protocol + "//" + domain + path}"><` + "/script>";

        if (embedType == "iframe") {
            scriptTag = `<iframe src="${protocol + "//" + domain + path}?theme=${theme}" width="100%" height="200" allowfullscreen="allowfullscreen" allowpaymentrequest frameborder="0"></iframe>`;
        }
        navigator.clipboard.writeText(scriptTag);
        copiedEmbed = true;
        setTimeout(function () {
            copiedEmbed = false;
        }, 1500);
    }

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
        }, 1000 * 0.2);
    }
    function switchView(s) {
        view = s;
        if (Object.keys(_0Day).length == 0) {
            getToday();
        }
        if (view == "90day") {
            scrollToRight();
        }
    }

    onMount(async () => {
        //getToday();
        //for each div with class 90daygrid scroll to right most
        scrollToRight();
    });
    afterUpdate(() => {
        dispatch("heightChange", {});
    });
</script>
<div class="grid grid-cols-12 gap-4 monitor pb-4">
    {#if monitor.embed === undefined}
    <div class="col-span-12 md:col-span-4">
        <div class="pt-1">
            <div class="scroll-m-20 text-2xl font-semibold tracking-tight">
                {#if monitor.image}
                <img src="{monitor.image}" class="w-6 h-6 inline" alt="{monitor.name}" srcset="" />
                {/if}
                <span> {monitor.name} </span>
                <br />
                {#if monitor.description}
                <Popover.Root>
                    <Popover.Trigger>
                        <span class="pt-0 pl-1 menu-monitor pr-0 pb-0 {buttonVariants({ variant: 'link' })}">
                            <Info size="{12}" class="text-muted-foreground" />
                        </span>
                    </Popover.Trigger>
                    <Popover.Content class="text-sm">
                        <h2 class="mb-2 text-lg font-semibold">{monitor.name}</h2>
                        <span class="text-muted-foreground text-sm"> {@html monitor.description} </span>
                    </Popover.Content>
                </Popover.Root>
                {/if}
                <Popover.Root>
                    <Popover.Trigger>
                        <span class="pt-0 pl-1 pb-0 menu-monitor pr-0 {buttonVariants({ variant: 'link' })}">
                            <Share2 size="{12}" class="text-muted-foreground" />
                        </span>
                    </Popover.Trigger>
                    <Popover.Content class="pl-1 pr-1 pb-1 w-[375px] max-w-full">
                        <h2 class="mb-1 text-lg font-semibold px-2">Share</h2>
                        <p class="pl-2 mb-2 text-muted-foreground text-sm">Share this monitor using a link with others.</p>
                        <Button class="ml-2" variant="secondary" on:click="{copyLinkToClipboard}">
                            {#if !copiedLink}
                            <Link class="inline mr-2" size="{12}" />
                            <span class="text-sm font-medium"> Copy Link </span>
                            {:else}
                            <CopyCheck class="inline mr-2" size="{12}" />
                            <span class="text-sm font-medium"> Copied Link </span>
                            {/if}
                        </Button>
                        <h2 class="mb-2 mt-4 text-lg font-semibold px-2">Embed</h2>
                        <p class="pl-2 mb-2 text-muted-foreground text-sm">Embed this monitor using &#x3C;script&#x3E; or &#x3C;iframe&#x3E; in your app.</p>
                        <div class="grid grid-cols-2 gap-2">
                            <div class="col-span-1 pl-4">
                                <h3 class="text-sm mb-2 text-muted-foreground">Theme</h3>
                                <RadioGroup.Root bind:value="{theme}">
                                    <div class="flex items-center space-x-2">
                                        <RadioGroup.Item value="light" id="light-theme" />
                                        <Label for="light-theme">Light</Label>
                                    </div>
                                    <div class="flex items-center space-x-2">
                                        <RadioGroup.Item value="dark" id="dark-theme" />
                                        <Label for="dark-theme">Dark</Label>
                                    </div>
                                    <RadioGroup.Input name="theme" />
                                </RadioGroup.Root>
                            </div>
                            <div class="col-span-1 pl-2">
                                <h3 class="text-sm mb-2 text-muted-foreground">Mode</h3>
                                <RadioGroup.Root bind:value="{embedType}">
                                    <div class="flex items-center space-x-2">
                                        <RadioGroup.Item value="js" id="js-embed" />
                                        <Label for="js-embed">&#x3C;script&#x3E;</Label>
                                    </div>
                                    <div class="flex items-center space-x-2">
                                        <RadioGroup.Item value="iframe" id="iframe-embed" />
                                        <Label for="iframe-embed">&#x3C;iframe&#x3E;</Label>
                                    </div>
                                    <RadioGroup.Input name="embed" />
                                </RadioGroup.Root>
                            </div>
                        </div>
                        <Button class="mb-2 mt-4 ml-2" variant="secondary" on:click="{copyScriptTagToClipboard}">
                            {#if !copiedEmbed}
                            <Code class="inline mr-2" size="{12}" />
                            <span class="text-sm font-medium"> Copy Code </span>
                            {:else}
                            <CopyCheck class="inline mr-2" size="{12}" />
                            <span class="text-sm font-medium"> Copied Code </span>
                            {/if}
                        </Button>
                        <h2 class="mb-2 mt-2 text-lg font-semibold px-2">Badge</h2>
                        <p class="pl-2 mb-2 text-muted-foreground text-sm">Get SVG badge for this monitor</p>
                        <Button class="mb-2 mt-2 ml-2" variant="secondary" on:click="{copyStatusBadge}">
                            {#if !copiedBadgeStatus}
                            <TrendingUp class="inline mr-2" size="{12}" />
                            <span class="text-sm font-medium"> Status Badge </span>
                            {:else}
                            <CopyCheck class="inline mr-2" size="{12}" />
                            <span class="text-sm font-medium"> Copied Badge </span>
                            {/if}
                        </Button>
                        <Button class="mb-2 mt-2 ml-2" variant="secondary" on:click="{copyUptimeBadge}">
                            {#if !copiedBadgeUptime}
                            <Percent class="inline mr-2" size="{12}" />
                            <span class="text-sm font-medium"> Uptime Badge </span>
                            {:else}
                            <CopyCheck class="inline mr-2" size="{12}" />
                            <span class="text-sm font-medium"> Copied Badge </span>
                            {/if}
                        </Button>
                    </Popover.Content>
                </Popover.Root>
            </div>
        </div>
        <div class="">
            <div class="grid grid-cols-2 gap-0">
                <div class="col-span-1 -mt-2">
                    <a href="/incident/{monitor.folderName}#past_incident" class="pt-0 pl-0 pb-0 text-indigo-500 text-left {buttonVariants({ variant: 'link' })}">
                        Recent Incidents <ArrowRight size="{16}" />
                    </a>
                </div>
            </div>
        </div>
    </div>
    {/if}
    <div class="col-span-12 {monitor.embed === undefined ? 'md:col-span-8': ''} pt-2">
        <div class="grid grid-cols-12">
            <div class="{monitor.embed === undefined ? 'col-span-12': 'col-span-8'} md:col-span-8 h-[32px]">
                <button class="inline-block" on:click="{(e) => {switchView('90day')}}">
                    <Badge variant="{view != '90day' ? 'outline' : ''}"> 90 Day ► {uptime90Day}% </Badge>
                </button>
                <button on:click="{(e) => {switchView('0day')}}">
                    <Badge variant="{view != '0day' ? 'outline' : ''}"> Today ► {uptime0Day}% </Badge>
                </button>
            </div>
            <div class="{monitor.embed === undefined ? 'col-span-12': 'col-span-4'} md:col-span-4 text-right h-[32px]">
                {#if _90Day[todayDD]}
                <div class="text-api-up {monitor.embed === undefined ? 'md:pr-6': ''} text-sm truncate font-semibold mt-[4px] text-{_90Day[todayDD].cssClass}">{_90Day[todayDD].message}</div>
                {/if}
            </div>
        </div>
        <div class="grid grid-cols-12">
            {#if view == "90day"}
            <div class="chart-status relative mt-1 col-span-12">
                <div class="flex overflow-x-auto daygrid90 overflow-y-hidden py-1">
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
        -ms-overflow-style: none; /* Internet Explorer 10+ */
        scrollbar-width: none; /* Firefox */
    }
    .daygrid90::-webkit-scrollbar {
        display: none; /* Safari and Chrome */
    }
    .oneline {
        transition: transform 0.1s ease-in;
        cursor: pointer;
    }
    .oneline:hover {
        transform: scaleY(1.2);
    }

    .oneline:hover + .show-hover {
        display: block !important;
    }

    .show-hover {
        display: none;
        top: 40px;
        padding: 0px;
        text-align: left;
    }

    .today-sq + .hiddenx .message {
        position: absolute;
        white-space: nowrap;
    }

    .today-sq + .hiddenx {
        visibility: hidden;
        z-index: 30;
    }
    .today-sq:hover + .hiddenx {
        visibility: visible;
    }
    .today-sq:hover {
        /* transform: scale(1.1); */
        box-shadow: rgba(50, 50, 105, 0.15) 0px 2px 5px 0px, rgba(0, 0, 0, 0.05) 0px 1px 1px 0px;
        opacity: 0.75;
        transition: all 0.1s ease-in;
        cursor: pointer;
    }

    .today-sq {
        position: relative;
        z-index: 0;
    }
</style>
