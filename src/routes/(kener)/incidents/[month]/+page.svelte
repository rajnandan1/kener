<script>
  import { Badge } from "$lib/components/ui/badge";
  import Incident from "$lib/components/IncidentNew.svelte";
  import { Button } from "$lib/components/ui/button";
  import { analyticsEvent } from "$lib/boringOne";
  import ArrowRight from "lucide-svelte/icons/arrow-right";
  import ArrowLeft from "lucide-svelte/icons/arrow-left";
  import ChevronLeft from "lucide-svelte/icons/chevron-left";
  import { base } from "$app/paths";
  import { goto } from "$app/navigation";
  import { l, f } from "$lib/i18n/client";
  import { startOfDay, addDays, subDays, getUnixTime, parse } from "date-fns";
  import { page } from "$app/stores";

  export let data;
  let selectedLang = data.selectedLang;
  let incidents = data.incidents;

  let incidentSmartDates = {};

  function tsToDate(mnt) {
    return mnt.unix();
  }

  incidents.forEach((incident) => {
    let startTime = incident.start_date_time;

    const today = getUnixTime(startOfDay(new Date(startTime * 1000)));
    const tomorrow = getUnixTime(startOfDay(addDays(new Date(startTime * 1000), 1)));
    const dayAfterTomorrow = getUnixTime(startOfDay(addDays(new Date(startTime * 1000), 2)));
    const yesterday = getUnixTime(startOfDay(subDays(new Date(startTime * 1000), 1)));
    const dayBeforeYesterday = getUnixTime(startOfDay(subDays(new Date(startTime * 1000), 2)));

    if (!incidentSmartDates[today]) {
      incidentSmartDates[today] = [];
    }
    if (!incidentSmartDates[tomorrow]) {
      incidentSmartDates[tomorrow] = [];
    }
    if (!incidentSmartDates[dayAfterTomorrow]) {
      incidentSmartDates[dayAfterTomorrow] = [];
    }
    if (!incidentSmartDates[yesterday]) {
      incidentSmartDates[yesterday] = [];
    }
    if (!incidentSmartDates[dayBeforeYesterday]) {
      incidentSmartDates[dayBeforeYesterday] = [];
    }

    incidentSmartDates[today].push(incident);
  });

  //sort the incidentSmartDates ascending
  let sortedIncidentSmartDates = Object.keys(incidentSmartDates).sort((a, b) => a - b);
  let canonical = data.canonical;
</script>

<svelte:head>
  <title>
    {f(parse(data.thisMonthName, "MMMM-yyyy", new Date()), "MMMM, yyyy", selectedLang, $page.data.localTz)}
    {l(data.lang, "Incident Updates")} |
    {data.site.title}
  </title>
  <meta
    name="description"
    content="{l(data.lang, 'Incident Updates')} | {l(data.lang, 'Recent Incidents')} | {l(
      data.lang,
      'Recent Maintenances'
    )} {f(parse(data.thisMonthName, 'MMMM-yyyy', new Date()), 'MMMM, yyyy', selectedLang, $page.data.localTz)} |
		{data.site.title}"
  />
  <link rel="canonical" href={canonical} />
</svelte:head>
<div class="mt-12"></div>
<section class="section-back mx-auto my-2 flex w-full max-w-[655px] flex-1 flex-col items-start justify-center">
  <Button
    variant="outline"
    class="bounce-left h-8   justify-start  pl-1.5"
    on:click={() => {
      analyticsEvent("incident_back_button_click");
      return (window.location.href = `${base}/`);
    }}
  >
    <ChevronLeft class="arrow mr-1 h-5 w-5" />
    {l(data.lang, "Back")}
  </Button>
</section>
<section class="section-month-banner mx-auto mb-8 flex max-w-[655px] flex-1 flex-col items-start justify-center">
  <div class="mesh mx-auto min-w-full max-w-[655px] rounded-md px-4 py-12 lg:flex lg:items-center">
    <div class="blurry-bg mx-auto max-w-3xl text-center text-muted">
      <h1 class="    text-5xl font-extrabold leading-tight">
        {f(new Date(data.midnightMonthStartUTCTimestamp * 1000), "MMMM, yyyy", selectedLang, $page.data.localTz)}
      </h1>
      <p class="mx-auto mt-4 max-w-xl font-medium sm:text-xl">
        {l(data.lang, "Incident Updates")}
      </p>
    </div>
  </div>

  <div
    class="section-month-events mx-auto mb-2 mt-4 flex w-full flex-1 flex-col items-start justify-center bg-transparent md:w-[655px]"
  >
    {#if sortedIncidentSmartDates.length == 0}
      <div class="mx-auto w-full rounded-md bg-clip-text p-12 text-center">
        <div class="mx-auto mb-4 h-[32px] w-[32px] text-primary">
          <picture>
            <source srcset="https://fonts.gstatic.com/s/e/notoemoji/latest/1f389/512.webp" type="image/webp" />
            <img src="https://fonts.gstatic.com/s/e/notoemoji/latest/1f389/512.gif" alt="🎉" width="32" height="32" />
          </picture>
        </div>

        <h1 class=" text-xl font-semibold leading-tight">
          {l(data.lang, "No Incident in %date", {
            date: f(
              new Date(data.midnightMonthStartUTCTimestamp * 1000),
              "MMMM, yyyy",
              selectedLang,
              $page.data.localTz
            )
          })}
        </h1>
      </div>
    {/if}
    {#each sortedIncidentSmartDates as date}
      <div class="mb-4 grid w-full grid-cols-2 gap-x-4 rounded-md border bg-card">
        <div class="text-md col-span-2 border-b p-2 px-4 font-medium">
          {f(new Date(date * 1000), "EEEE, MMMM do", data.selectedLang, $page.data.localTz)}
        </div>
        {#if incidentSmartDates[date].length === 0}
          <div class="col-span-2 p-2 px-4 text-sm font-medium text-muted-foreground">
            {l(data.lang, "No Incidents")}
          </div>
        {/if}
        {#each incidentSmartDates[date] as incident, index}
          <div class="newincidents col-span-2">
            <Incident {incident} lang={data.lang} index="incident-{index}" {selectedLang} />
          </div>
        {/each}
      </div>
    {/each}
  </div>
  <div class="mx-auto mb-2 mt-4 flex w-full flex-1 flex-col items-start justify-center bg-transparent md:w-[655px]">
    <div class="flex w-full justify-between">
      <Button
        type="submit"
        variant="secondary"
        class="bounce-left"
        on:click={() => {
          window.location.href = `${base}/incidents/${data.prevMonthName}`;
        }}
      >
        <ArrowLeft class="arrow mr-2 h-4 w-4" />
        {f(new Date(data.midnightPrevMonthUTCTimestamp * 1000), "MMMM, yyyy", selectedLang, $page.data.localTz)}
      </Button>
      <Button
        variant="secondary"
        class="bounce-right"
        on:click={() => {
          window.location.href = `${base}/incidents/${data.nextMonthName}`;
        }}
      >
        {f(new Date(data.midnightNextMonthUTCTimestamp * 1000), "MMMM, yyyy", selectedLang, $page.data.localTz)}
        <ArrowRight class="arrow ml-2 h-4 w-4" />
      </Button>
    </div>
  </div>
</section>
