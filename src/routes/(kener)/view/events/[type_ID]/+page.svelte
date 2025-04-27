<script>
  import Incident from "$lib/components/IncidentNew.svelte";
  import { l, f } from "$lib/i18n/client";
  import { base } from "$app/paths";
  import { page } from "$app/stores";
  import { Button } from "$lib/components/ui/button";
  import { analyticsEvent } from "$lib/boringOne";
  import ChevronLeft from "lucide-svelte/icons/chevron-left";
  export let data;
  let incident = data.incident;
</script>

<svelte:head>
  <title>
    {data.title}
  </title>
  <meta name="description" content={data.title} />
</svelte:head>

<section class="section-view-event-id mx-auto mb-8 mt-20 flex max-w-[820px] flex-1 flex-col items-start justify-center">
  <Button
    variant="outline"
    class="bounce-left mb-2  h-8 justify-start  pl-1.5"
    on:click={() => {
      analyticsEvent("incident_back_button_click");
      return (window.location.href = `${base}/`);
    }}
  >
    <ChevronLeft class="arrow mr-1 h-5 w-5" />
    {l(data.lang, "Back")}
  </Button>
  {#if !!incident}
    <div class=" w-full rounded-md border bg-card">
      <Incident
        {incident}
        lang={$page.data.lang}
        index={`incident-0`}
        selectedLang={$page.data.selectedLang}
        allowCollapse={false}
      />
    </div>
  {/if}
  {#if !!data.error}
    <div class="mt-20 w-full rounded-md border bg-background">
      <p class="py-3 text-center text-lg font-medium text-destructive">{data.error}</p>
    </div>
  {/if}
</section>
