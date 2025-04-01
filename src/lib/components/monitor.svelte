<script>
  import * as Popover from "$lib/components/ui/popover";
  import { onMount } from "svelte";
  import { Badge } from "$lib/components/ui/badge";
  import { Button } from "$lib/components/ui/button";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu";
  import { base } from "$app/paths";
  import { sub, startOfDay, getUnixTime } from "date-fns";
  import GMI from "$lib/components/gmi.svelte";
  import { page } from "$app/stores";
  import { analyticsEvent } from "$lib/boringOne";
  import Share2 from "lucide-svelte/icons/share-2";
  import ArrowRight from "lucide-svelte/icons/arrow-right";
  import Settings from "lucide-svelte/icons/settings";
  import TrendingUp from "lucide-svelte/icons/trending-up";
  import Loader from "lucide-svelte/icons/loader";
  import ChevronLeft from "lucide-svelte/icons/chevron-left";
  import ChevronRight from "lucide-svelte/icons/chevron-right";
  import { buttonVariants } from "$lib/components/ui/button";
  import { createEventDispatcher } from "svelte";
  import { afterUpdate } from "svelte";
  import axios from "axios";
  import { l, summaryTime, f } from "$lib/i18n/client";
  import { hoverAction, clickOutsideAction, slide } from "svelte-legos";
  import LoaderBoxes from "$lib/components/loaderbox.svelte";
  import NumberFlow from "@number-flow/svelte";
  import Incident from "$lib/components/IncidentNew.svelte";

  const dispatch = createEventDispatcher();

  export let monitor;
  export let localTz;
  export let lang;
  export let embed = false;
  export let selectedLang = "en";

  let _0Day = {};
  let _90Day = monitor.pageData._90Day;
  let uptime90Day = monitor.pageData.uptime90Day;
  let incidents = {};
  let dayIncidentsFull = [];

  function loadIncidents() {
    axios
      .post(`${base}/api/today/incidents`, {
        tag: monitor.tag,
        startTs: monitor.pageData.midnight90DaysAgo,
        endTs: monitor.pageData.maxDateTodayTimestamp,
        localTz: localTz
      })
      .then((response) => {
        if (response.data) {
          incidents = response.data;
        }
      })
      .catch((error) => {
        console.log(error);
      });
  }

  function getToday(startTs, incidentIDs) {
    let endTs = Math.min(startTs + 86400, monitor.pageData.maxDateTodayTimestamp);

    axios
      .post(`${base}/api/today`, {
        monitor: monitor,
        localTz: localTz,
        endTs: endTs,
        startTs: startTs,
        incidentIDs: incidentIDs
      })
      .then((response) => {
        if (response.data) {
          _0Day = response.data._0Day;
          dayUptime = response.data.uptime;
          dayIncidentsFull = response.data.incidents;
        }
        loadingDayData = false;
      })
      .catch((error) => {
        console.log(error);
        loadingDayData = false;
      });
  }

  function scrollToRight() {
    setTimeout(() => {
      let divs = document.querySelectorAll(".daygrid90");
      divs.forEach((div) => {
        div.scrollLeft = div.scrollWidth;
      });
    }, 1000 * 0.2);
  }
  let uptimesRollers = [
    {
      text: `${l(lang, "90 Days")}`,
      startTs: monitor.pageData.startOfTheDay - 86400 * 89,
      endTs: monitor.pageData.maxDateTodayTimestamp,
      value: uptime90Day
    },
    {
      text: `${l(lang, "60 Days")}`,
      startTs: monitor.pageData.startOfTheDay - 86400 * 59,
      endTs: monitor.pageData.maxDateTodayTimestamp
    },
    {
      text: `${l(lang, "30 Days")}`,
      startTs: monitor.pageData.startOfTheDay - 86400 * 29,
      endTs: monitor.pageData.maxDateTodayTimestamp
    },
    {
      text: `${l(lang, "14 Days")}`,
      startTs: monitor.pageData.startOfTheDay - 86400 * 13,
      endTs: monitor.pageData.maxDateTodayTimestamp
    },
    {
      text: `${l(lang, "7 Days")}`,
      startTs: monitor.pageData.startOfTheDay - 86400 * 6,
      endTs: monitor.pageData.maxDateTodayTimestamp
    },
    {
      text: l(lang, "Today"),
      startTs: monitor.pageData.startOfTheDay,
      endTs: monitor.pageData.maxDateTodayTimestamp
    }
  ];

  //start of the week moment
  let rolledAt = 0;
  let rollerLoading = false;
  async function rollSummary(r) {
    let newRolledAt = r;
    analyticsEvent("monitor_interval_switch", {
      tag: monitor.tag,
      interval: uptimesRollers[newRolledAt].text
    });

    if (uptimesRollers[newRolledAt].value === undefined) {
      rollerLoading = true;
      uptimesRollers[newRolledAt].loading = true;

      let resp = await axios.post(`${base}/api/today/aggregated`, {
        monitor: monitor,
        startTs: uptimesRollers[newRolledAt].startTs,
        endTs: uptimesRollers[newRolledAt].endTs
      });
      uptimesRollers[newRolledAt].value = resp.data.uptime;
      rollerLoading = false;
    }
    rolledAt = newRolledAt;
    for (const key in _90Day) {
      if (Object.prototype.hasOwnProperty.call(_90Day, key)) {
        const element = _90Day[key];
        if (key >= uptimesRollers[rolledAt].startTs) {
          _90Day[key].border = true;
        } else {
          _90Day[key].border = false;
        }
      }
    }
  }

  onMount(async () => {
    scrollToRight();
    loadIncidents();
  });
  afterUpdate(() => {
    dispatch("heightChange", {});
  });
  function show90Inline(e, bar) {
    if (e.detail.hover) {
      _90Day[bar.timestamp].showDetails = true;
    } else {
      _90Day[bar.timestamp].showDetails = false;
    }
  }
  let showDailyDataModal = false;
  let dateFetchedFor = "";
  let dayUptime = "NA";
  let loadingDayData = false;

  function dailyDataGetter(e, bar, incidentObj) {
    if (embed) {
      return;
    }

    let incidentIDs = incidentObj?.ids || [];
    dayUptime = "NA";
    dateFetchedFor = f(new Date(bar.timestamp * 1000), "EEEE, MMMM do, yyyy", selectedLang, $page.data.localTz);
    showDailyDataModal = true;

    loadingDayData = true;
    dayIncidentsFull = [];
    analyticsEvent("monitor_day_data", {
      tag: monitor.tag,
      data_date: dateFetchedFor
    });
    setTimeout(() => {
      getToday(bar.timestamp, incidentIDs);
    }, 50);
  }
</script>

<div class="monitor relative grid w-full grid-cols-12 gap-2 pb-2 pt-0 md:w-[655px]">
  {#if !!!embed}
    <div class="col-span-12 md:w-[546px]">
      <div class="pt-0">
        <div class="scroll-m-20 pr-5 text-xl font-medium tracking-tight">
          {#if monitor.image}
            <GMI
              src={monitor.image}
              classList="absolute left-6 top-6 inline h-5 w-5 hidden md:block"
              alt={monitor.name}
              srcset=""
            />
          {/if}
          <p class="overflow-hidden text-ellipsis whitespace-nowrap">
            {monitor.name}
          </p>

          <p class="mt-1 text-xs font-medium text-muted-foreground">
            {#if !!monitor.description}
              {@html monitor.description}
            {/if}
          </p>
          <div class="absolute right-4 top-5 flex gap-x-2 md:right-14">
            {#if $page.data.isLoggedIn}
              <Button
                href="{base}/manage/app/monitors#{monitor.tag}"
                class=" rotate-once h-5 p-0 text-muted-foreground hover:text-primary"
                variant="link"
                rel="external"
              >
                <Settings class="h-4 w-4 " />
              </Button>
            {/if}
            <Button
              class="wiggle h-5 p-0 text-muted-foreground hover:text-primary"
              variant="link"
              on:click={(e) => {
                dispatch("show_shareMenu", {
                  monitor: monitor
                });
              }}
            >
              <Share2 class="h-4 w-4 " />
            </Button>
          </div>
        </div>
      </div>
    </div>
  {/if}
  <div class="col-span-12 min-h-[94px] pt-2 md:w-[546px]">
    <div class="col-span-12">
      <div class="flex flex-wrap justify-between gap-x-1">
        <div class="">
          <DropdownMenu.Root class="">
            <DropdownMenu.Trigger class="mr-2 flex ">
              <Button variant="secondary" class="h-6 px-2 py-2 text-xs">
                {uptimesRollers[rolledAt].text}
              </Button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content class={!!embed ? "h-[60px] overflow-y-auto" : ""}>
              {#each uptimesRollers as roller, i}
                <DropdownMenu.Group>
                  <DropdownMenu.Item
                    class="text-xs {rolledAt == i ? 'bg-secondary' : ''} font-semibold"
                    on:click={() => rollSummary(i)}
                  >
                    {roller.text}
                  </DropdownMenu.Item>
                </DropdownMenu.Group>
              {/each}
            </DropdownMenu.Content>
          </DropdownMenu.Root>
        </div>
        <div class="flex gap-x-2 pt-2 text-right">
          {#if rollerLoading}
            <Loader class=" mt-0.5 inline h-3.5 w-3.5 animate-spin text-muted-foreground" />
          {/if}
          {#if !isNaN(uptimesRollers[rolledAt].value)}
            <NumberFlow
              class="border-r pr-2 text-xs font-semibold"
              value={uptimesRollers[rolledAt].value}
              format={{
                notation: "standard",
                minimumFractionDigits: 4,
                maximumFractionDigits: 4
              }}
              suffix="%"
            />
          {/if}
          <div class="truncate text-xs font-semibold text-{monitor.pageData.summaryColorClass}">
            {monitor.pageData.summaryStatus}
          </div>
        </div>
      </div>
      <div
        class="relative col-span-12 mt-0.5"
        use:clickOutsideAction
        on:clickoutside={(e) => {
          showDailyDataModal = false;
        }}
      >
        <div class="daygrid90 flex min-h-[60px] justify-start overflow-x-auto overflow-y-hidden py-1">
          {#each Object.entries(_90Day) as [ts, bar]}
            <a
              data-ts={ts}
              use:hoverAction
              on:hover={(e) => {
                show90Inline(e, bar);
              }}
              on:click={(e) => {
                dailyDataGetter(e, bar, incidents[ts]);
              }}
              href="#"
              class="oneline h-[34px] w-[6px]
							{bar.border ? 'opacity-100' : 'opacity-20'} pb-1"
            >
              <div
                class="oneline-in h-[30px] bg-{bar.cssClass} mx-auto w-[4px] rounded-{monitor.pageData.barRoundness.toUpperCase() ==
                'SHARP'
                  ? 'none'
                  : 'sm'}"
              ></div>
              {#if !!incidents[ts]}
                <div
                  class="bg-api-{incidents[
                    ts
                  ].monitor_impact.toLowerCase()} comein absolute -bottom-[3px] left-[1px] h-[4px] w-[4px] rounded-full"
                ></div>
              {/if}
            </a>
            {#if bar.showDetails}
              <div class="show-hover absolute text-sm">
                <div class="text-{bar.textClass} text-xs font-semibold">
                  {f(new Date(bar.timestamp * 1000), "EEEE, MMMM do, yyyy", selectedLang, $page.data.localTz)}
                  -
                  {bar.summaryStatus}
                </div>
              </div>
            {/if}
          {/each}
        </div>
        {#if monitor.monitor_type === "GROUP" && !!!embed}
          <div class="-mt-4 flex justify-end">
            <Button
              variant="secondary"
              href="{base}?group={monitor.tag}"
              rel="external"
              class="bounce-right h-8 text-xs"
              on:click={scrollToRight}
            >
              {l(lang, "View in detail")}
              <ArrowRight class="arrow ml-1.5 h-4 w-4" />
            </Button>
          </div>
        {/if}

        {#if showDailyDataModal}
          <div
            transition:slide={{ direction: "bottom" }}
            class="absolute -left-2 top-10 z-10 mx-auto rounded-sm border bg-card px-[7px] py-[7px] shadow-lg md:w-[560px]"
          >
            <div class="mb-2 flex justify-between text-xs font-semibold">
              <span>{dateFetchedFor}</span>
              {#if !loadingDayData}
                <span>
                  <TrendingUp class="mx-1 inline" size={12} />
                  {dayUptime}%</span
                >
              {/if}
            </div>
            {#if dayIncidentsFull.length > 0}
              <div class="-mx-2 mb-4 grid grid-cols-1">
                <div class="col-span-1 px-2">
                  <Badge variant="outline" class="border-0 pl-0">
                    {l(lang, "Incident Updates")}
                  </Badge>
                </div>
                {#each dayIncidentsFull as incident, index}
                  <div class="col-span-1">
                    <Incident {incident} {lang} index="incident-{index}" />
                  </div>
                {/each}
              </div>
            {/if}
            <div class="flex flex-wrap">
              {#if loadingDayData}
                <LoaderBoxes />
              {:else}
                {#each Object.entries(_0Day) as [ts, bar]}
                  <div data-index={bar.index} class="bg-{bar.cssClass} today-sq m-[1px] h-[10px] w-[10px]"></div>
                  <div class="hiddenx relative">
                    <div
                      data-index={ts.index}
                      class="message rounded border bg-black p-2 text-xs font-semibold text-white"
                    >
                      <p>
                        <span class="text-{bar.cssClass}"> ● </span>

                        {f(new Date(bar.timestamp * 1000), "hh:mm a", selectedLang, $page.data.localTz)}
                      </p>
                      {#if bar.status != "NO_DATA"}
                        <p class="pl-2">
                          {l(lang, bar.status)}
                        </p>
                      {:else}
                        <p class="pl-2">-</p>
                      {/if}
                    </div>
                  </div>
                {/each}
              {/if}
            </div>
          </div>
        {/if}
      </div>
    </div>
  </div>
</div>
