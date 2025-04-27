<script>
  import { l, f } from "$lib/i18n/client";
  import { startOfDay, addDays, subDays, getUnixTime, parse } from "date-fns";
  import { page } from "$app/stores";
  import { Button } from "$lib/components/ui/button";
  import Incident from "$lib/components/IncidentNew.svelte";
  import { analyticsEvent } from "$lib/boringOne";
  import ChevronLeft from "lucide-svelte/icons/chevron-left";
  import { base } from "$app/paths";

  export let data;
  let incidents = data.incidents;

  let incidentSmartDates = {};

  incidents.forEach((incident) => {
    let startTime = incident.start_date_time;

    const today = getUnixTime(startOfDay(new Date(startTime * 1000)));

    if (!incidentSmartDates[today]) {
      incidentSmartDates[today] = [];
    }

    incidentSmartDates[today].push(incident);
  });
  let sortedIncidentSmartDates = Object.keys(incidentSmartDates).sort((a, b) => a - b);

  // Additional logic can be added here
</script>

<div class="mt-10"></div>
<section class="section-back mx-auto my-2 flex w-full max-w-[655px] flex-1 flex-col items-start justify-center">
  <div class="  mx-auto min-w-full max-w-[655px] rounded-md px-4 py-12 lg:flex lg:items-center">
    <div class=" mx-auto text-center">
      <h1 class="    text-3xl font-extrabold leading-tight">Upcoming Maintenances</h1>
    </div>
  </div>
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
<section class="section-view-event mx-auto mb-8 flex max-w-[820px] flex-1 flex-col items-start justify-center">
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

        <h1 class=" text-xl font-semibold leading-tight">There are no upcoming maintenances</h1>
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
            <Incident {incident} lang={data.lang} index="incident-{index}" selectedLang={$page.data.selectedLang} />
          </div>
        {/each}
      </div>
    {/each}
  </div>
</section>
