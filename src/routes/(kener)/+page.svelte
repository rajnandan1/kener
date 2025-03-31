<script>
  import Monitor from "$lib/components/monitor.svelte";
  import * as Card from "$lib/components/ui/card";
  import { Button, buttonVariants } from "$lib/components/ui/button";
  import Incident from "$lib/components/IncidentNew.svelte";
  import { Badge } from "$lib/components/ui/badge";
  import { l } from "$lib/i18n/client";
  import { base } from "$app/paths";
  import ArrowRight from "lucide-svelte/icons/arrow-right";
  import ChevronLeft from "lucide-svelte/icons/chevron-left";
  import X from "lucide-svelte/icons/x";
  import { hotKeyAction, clickOutsideAction } from "svelte-legos";
  import { onMount } from "svelte";
  import ShareMenu from "$lib/components/shareMenu.svelte";
  import { analyticsEvent } from "$lib/boringOne";
  import { scale } from "svelte/transition";
  import { format } from "date-fns";
  import GMI from "$lib/components/gmi.svelte";

  export let data;
  let shareMenusToggle = false;
  function showShareMenu(e) {
    shareMenusToggle = true;
    activeMonitor = e.detail.monitor;
  }
  let activeMonitor = null;
  let pageLoaded = false;
  $: {
    if (pageLoaded) {
      if (shareMenusToggle) {
        document.body.style.overflow = "hidden";
      } else {
        document.body.style.overflow = "auto";
      }
    }
  }

  onMount(() => {
    pageLoaded = true;
  });
  let kindFilter = "INCIDENT";
  function kindOfIncidents(kind) {
    analyticsEvent("monitor_incident_kind_filter", {
      kind: kind
    });
    kindFilter = kind;
  }

  if (data.allRecentIncidents.length == 0) {
    kindOfIncidents("MAINTENANCE");
  }

  function closeShareMenu() {
    shareMenusToggle = false;
    analyticsEvent("monitor_share_menu_close", {
      tag: activeMonitor.tag
    });
  }
</script>

<svelte:head>
  <title>{data.pageTitle}</title>
  {#if !!data.pageDescription}
    <meta name="description" content={data.pageDescription} />
  {/if}
  {#if !!data.canonical}
    <link rel="canonical" href={data.canonical} />
  {/if}
  {#if data.site.metaTags}
    {#each data.site.metaTags as metaTag}
      {#if metaTag.key != "description"}
        <meta name={metaTag.key} content={metaTag.value} />
      {/if}
    {/each}
  {/if}
</svelte:head>
<div class="mt-12"></div>
{#if data.hero}
  <section class="section-hero mx-auto mb-8 flex w-full max-w-[655px] flex-1 flex-col items-start justify-center">
    <div class="mx-auto max-w-3xl text-center">
      {#if data.hero.image}
        <GMI src={data.hero.image} classList="m-auto mb-2 h-14 w-14" alt="" srcset="" />
      {/if}
      {#if data.hero.title}
        <h1 class="h1 text-5xl font-extrabold leading-tight">
          {@html data.hero.title}
        </h1>
      {/if}
      {#if data.hero.subtitle}
        <h2 class="mx-auto mt-4 max-w-xl sm:text-xl">
          {@html data.hero.subtitle}
        </h2>
      {/if}
    </div>
  </section>
{/if}
{#if data.pageType != "home"}
  <section class="section-back mx-auto my-2 flex w-full max-w-[655px] flex-1 flex-col items-start justify-center">
    <Button
      variant="outline"
      class="bounce-left h-8   justify-start  pl-1.5"
      on:click={() => {
        if (data.pageType == "category") {
          analyticsEvent("category_back_button_click");
          return window.history.back();
        } else if (data.pageType == "monitor") {
          analyticsEvent("monitor_back_button_click");
          return (window.location.href = `${base}/`);
        } else if (data.pageType == "group") {
          analyticsEvent("group_back_button_click");
          return (window.location.href = `${base}/`);
        }
      }}
    >
      <ChevronLeft class="arrow mr-1 h-5 w-5" />
      {l(data.lang, "Back")}
    </Button>
  </section>
{/if}
{#if data.allRecentIncidents.length + data.allRecentMaintenances.length > 0}
  <section
    class="section-events mx-auto mb-8 flex w-full max-w-[655px] flex-1 flex-col items-start justify-center"
    id=""
  >
    <div class="mb-2 grid w-full grid-cols-2 gap-4">
      <div class="col-span-2 flex gap-x-2 text-center md:text-left">
        {#if kindFilter == "INCIDENT"}
          {#if data.allRecentIncidents.length > 0}
            <Button class="h-8   text-sm  " on:click={() => kindOfIncidents("INCIDENT")}>
              {l(data.lang, "Recent Incidents")}
            </Button>
          {/if}
          {#if data.allRecentMaintenances.length > 0}
            <Button variant="secondary" class=" h-8 text-sm" on:click={() => kindOfIncidents("MAINTENANCE")}>
              {l(data.lang, "Recent Maintenances")}
            </Button>
          {/if}
        {:else}
          {#if data.allRecentIncidents.length > 0}
            <Button variant="secondary" class="h-8  text-sm " on:click={() => kindOfIncidents("INCIDENT")}>
              {l(data.lang, "Recent Incidents")}
            </Button>
          {/if}
          {#if data.allRecentMaintenances.length > 0}
            <Button class="h-8  text-sm" on:click={() => kindOfIncidents("MAINTENANCE")}>
              {l(data.lang, "Recent Maintenances")}
            </Button>
          {/if}
        {/if}
      </div>
    </div>
    <Card.Root class="w-full">
      {#if kindFilter == "INCIDENT"}
        <Card.Content class=" newincidents w-full overflow-hidden p-0">
          {#each data.allRecentIncidents as incident, index}
            <Incident {incident} lang={data.lang} index="incident-{index}" selectedLang={data.selectedLang} />
          {/each}
        </Card.Content>
      {:else if kindFilter == "MAINTENANCE"}
        {#each data.allRecentMaintenances as incident, index}
          <Incident {incident} lang={data.lang} index="incident-{index}" selectedLang={data.selectedLang} />
        {/each}
      {/if}
    </Card.Root>
  </section>
{/if}
{#if data.monitors.length > 0}
  <section
    class="section-legend mx-auto mb-2 flex w-full flex-1 flex-col items-start justify-center bg-transparent md:w-[655px]"
    id=""
  >
    <div class="grid w-full grid-cols-2 gap-4">
      <div class="col-span-2 text-center md:col-span-1 md:text-left">
        <Badge class="border-0 md:pl-0" variant="outline">
          {l(data.lang, "Availability per Component")}
        </Badge>
      </div>
      <div class="col-span-2 text-center md:col-span-1 md:text-right">
        <Badge variant="outline" class="border-0 md:pr-0">
          <span class="bg-api-up mr-1 inline-flex h-[8px] w-[8px] rounded-full opacity-75"></span>
          <span class="mr-3">
            {l(data.lang, "UP")}
          </span>

          <span class="bg-api-degraded mr-1 inline-flex h-[8px] w-[8px] rounded-full opacity-75"></span>
          <span class="mr-3">
            {l(data.lang, "DEGRADED")}
          </span>

          <span class="bg-api-down mr-1 inline-flex h-[8px] w-[8px] rounded-full opacity-75"></span>
          <span class="">
            {l(data.lang, "DOWN")}
          </span>
        </Badge>
      </div>
    </div>
  </section>
  <section
    class="section-monitors z-20 mx-auto mb-8 flex w-full flex-1 flex-col items-start justify-center backdrop-blur-[2px] md:w-[655px]"
  >
    <Card.Root class="monitor-root">
      <Card.Content class="monitors-card  p-0">
        {#each data.monitors as monitor}
          <Monitor
            on:show_shareMenu={showShareMenu}
            {monitor}
            localTz={data.localTz}
            lang={data.lang}
            selectedLang={data.selectedLang}
          />
        {/each}
      </Card.Content>
    </Card.Root>
  </section>
{/if}
{#if data.site.categories && data.pageType == "home"}
  <section
    class="section-categories relative z-10 mx-auto mb-8 w-full max-w-[890px] flex-1 flex-col items-start backdrop-blur-[2px] md:w-[655px]"
  >
    {#each data.site.categories.filter((e) => e.name != "Home") as category}
      <a href={`?category=${category.name}`} rel="external">
        <Card.Root class="mb-4 hover:bg-secondary">
          <Card.Header class="bounce-right relative w-full cursor-pointer px-4  ">
            <Card.Title class="w-full ">
              {category.name}
              <Button
                variant="ghost"
                class="arrow absolute right-4 top-9 h-5 w-5 p-0 text-muted-foreground"
                size="icon"
              >
                <ArrowRight class="h-4 w-4" />
              </Button>
            </Card.Title>
            <Card.Description>
              {#if category.description}
                {@html category.description}
              {/if}
            </Card.Description>
          </Card.Header>
        </Card.Root>
      </a>
    {/each}
  </section>
{/if}
<section
  class="section-browser-events mx-auto mb-2 flex w-full max-w-[655px] flex-1 flex-col items-start justify-center bg-transparent"
  id=""
>
  <a
    href="{base}/incidents/{format(new Date(), 'MMMM-yyyy')}"
    rel="external"
    class="bounce-right grid w-full cursor-pointer grid-cols-2 justify-between gap-4 rounded-md border bg-card px-4 py-2 text-sm font-medium hover:bg-secondary"
  >
    <div class="col-span-1 text-left">
      {l(data.lang, "Browse Events")}
    </div>
    <div class="text-right">
      <span class="arrow float-right mt-0.5">
        <ArrowRight class="h-4 w-4 text-muted-foreground hover:text-primary" />
      </span>
    </div>
  </a>
</section>
{#if shareMenusToggle}
  <div
    transition:scale={{ duration: 100 }}
    use:hotKeyAction={{
      code: "Escape",
      cb: () => closeShareMenu()
    }}
    class="moldal-container fixed left-0 top-0 z-30 h-screen w-full bg-card bg-opacity-30 backdrop-blur-sm"
  >
    <div
      use:clickOutsideAction
      on:clickoutside={() => {
        closeShareMenu();
      }}
      class="absolute left-1/2 top-1/2 h-fit w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-md border bg-background shadow-lg backdrop-blur-lg md:w-[568px]"
    >
      <Button
        variant="ghost"
        on:click={() => {
          closeShareMenu();
        }}
        class="absolute right-2 top-2 z-40 h-6 w-6   rounded-full border bg-background p-1"
      >
        <X class="h-4 w-4   text-muted-foreground" />
      </Button>
      <div class="content">
        <ShareMenu monitor={activeMonitor} lang={data.lang} selectedLang={data.selectedLang} />
      </div>
    </div>
  </div>
{/if}
