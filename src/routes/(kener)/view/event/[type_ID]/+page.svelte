<script>
  import Incident from "$lib/components/IncidentNew.svelte";
  import { page } from "$app/stores";
  export let data;
  let incident = data.incident;
  console.log(">>>>>>----  +page:6 ", $page);
</script>

<svelte:head>
  <title>
    {incident.title}
  </title>
</svelte:head>

<section class="section-view-banner mx-auto mb-8 flex max-w-[820px] flex-1 flex-col items-start justify-center">
  <div class="mt-20 w-full rounded-md border">
    <Incident
      {incident}
      lang={$page.data.lang}
      index={`incident-0`}
      selectedLang={$page.data.selectedLang}
      allowCollapse={false}
    />
  </div>
</section>
