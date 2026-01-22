<script>
  import { formatDistanceToNow, formatDistance } from "date-fns";
  import Settings from "lucide-svelte/icons/settings";
  import ArrowRight from "lucide-svelte/icons/arrow-right";
  import Copy from "lucide-svelte/icons/copy";
  import Check from "lucide-svelte/icons/check";
  import { analyticsEvent } from "$lib/boringOne";
  import * as Accordion from "$lib/components/ui/accordion";
  import { l, f, fd, fdn } from "$lib/i18n/client";
  import { base } from "$app/paths";
  import { Button } from "$lib/components/ui/button";
  import { Tooltip } from "bits-ui";
  import GMI from "$lib/components/gmi.svelte";
  import { page } from "$app/state";
  import { marked } from "marked";
  import { onMount } from "svelte";

  export let incident;
  export let index;
  export let allowCollapse = true;
  let startTime = new Date(incident.start_date_time * 1000);
  let endTime = new Date();
  let nowTime = new Date();
  if (incident.end_date_time) {
    endTime = new Date(incident.end_date_time * 1000);
  }
  let incidentType = incident.incident_type;
  const lastedFor = fd(startTime, endTime, $page.data.selectedLang);
  const remainingTime = fd(nowTime, endTime, $page.data.selectedLang);
  const startedAt = fdn(startTime, $page.data.selectedLang);

  let incidentTimeStatus = "";
  if (nowTime < startTime) {
    incidentTimeStatus = "YET_TO_START";
  } else if (nowTime >= startTime && nowTime <= endTime) {
    incidentTimeStatus = "ONGOING";
  } else if (nowTime > endTime) {
    incidentTimeStatus = "COMPLETED";
  }

  let accordionValue = "incident-0";
  if ($page.data.site.incidentGroupView == "COLLAPSED" && allowCollapse) {
    accordionValue = "incident-collapse";
  } else if ($page.data.site.incidentGroupView == "EXPANDED") {
    accordionValue = index;
  }

  let incidentDateSummary = "";
  let maintenanceBadge = "";
  let maintenanceBadgeColor = "";

  if (incidentTimeStatus == "YET_TO_START") {
    incidentDateSummary = l($page.data.lang, "Starts %startedAt", { startedAt });
    if (incidentType === "MAINTENANCE") {
      incidentDateSummary = l($page.data.lang, "Starts %startedAt, will last for %lastedFor", {
        startedAt,
        lastedFor
      });
      maintenanceBadge = "Upcoming Maintenance";
      maintenanceBadgeColor = "text-upcoming-maintenance";
    }
  } else if (incidentTimeStatus == "ONGOING") {
    incidentDateSummary = l($page.data.lang, "Started %startedAt, still ongoing", {
      startedAt
    });
    if (incidentType === "MAINTENANCE") {
      incidentDateSummary = l($page.data.lang, "Started %startedAt, will last for %lastedFor more", {
        startedAt,
        lastedFor: remainingTime
      });
      maintenanceBadge = "Maintenance in Progress";
      maintenanceBadgeColor = "text-maintenance-in-progress";
    }
  } else if (incidentTimeStatus == "COMPLETED") {
    incidentDateSummary = l($page.data.lang, "Started %startedAt, lasted for %lastedFor", {
      startedAt,
      lastedFor
    });
    maintenanceBadge = "Maintenance Completed";
    maintenanceBadgeColor = "text-maintenance-completed";
  }
  let pathMonitorLink = "";
  onMount(async () => {
    let protocol = window.location.protocol;
    let domain = window.location.host;
    pathMonitorLink = `${protocol}//${domain}${base}/view/events/${incident.incident_type}-${incident.id}`;
  });
</script>

<div class="newincident relative grid w-full grid-cols-12 gap-2 px-0 py-0 last:border-b-0">
  <div class="col-span-12">
    <Accordion.Root
      bind:value={index}
      class="accor {allowCollapse === false ? 'hide-chevron' : ''}"
      disabled={!allowCollapse}
    >
      <Accordion.Item value={accordionValue}>
        <Accordion.Trigger
          class="hover:bg-muted rounded-md px-4 hover:no-underline"
          on:click={() => analyticsEvent("incident_open", { incident_title: incident.title })}
        >
          <div class="w-full text-left hover:no-underline">
            <div class="flex justify-start gap-x-2">
              <p class="flex gap-x-2 text-xs font-semibold">
                {#if incidentType == "INCIDENT"}
                  <span class="badge-{incident.state}">
                    {l($page.data.lang, incident.state)}
                  </span>
                {:else if incidentType == "MAINTENANCE"}
                  <span class="{maintenanceBadgeColor}  ">
                    {l($page.data.lang, maintenanceBadge)}
                  </span>
                {/if}
              </p>
              <div class="flex justify-end gap-x-2">
                {#if $page.data.isLoggedIn}
                  <Button
                    href="{base}/manage/app/events#{incident.id}"
                    class="rotate-once text-muted-foreground hover:text-primary h-5 p-0"
                    variant="link"
                  >
                    <Settings class="h-4 w-4 " />
                  </Button>
                {/if}
                {#if !!pathMonitorLink}
                  <Button
                    size="icon"
                    variant="link"
                    class="copybtn text-muted-foreground hover:text-primary relative h-5 p-0"
                    on:click={(e) => {
                      e.stopPropagation();
                      navigator.clipboard.writeText(pathMonitorLink);
                      analyticsEvent("incident_copy_link", { incident_title: incident.title });
                    }}
                  >
                    <Check class="check-btn absolute top-0 left-0 h-4 w-4 text-green-500" />
                    <Copy class="copy-btn absolute top-0 left-0 h-4 w-4 " />
                  </Button>
                {/if}
              </div>
            </div>

            <p class="font-medium">
              {incident.title}
            </p>
            {#if !!incidentDateSummary}
              <Tooltip.Root openDelay={100} side="bottom" align="end">
                <Tooltip.Trigger
                  class=" text-muted-foreground text-xs font-medium tracking-normal text-ellipsis    whitespace-nowrap"
                >
                  {incidentDateSummary}
                </Tooltip.Trigger>
                <Tooltip.Content class=" z-20 mt-11" side="bottom" align="end">
                  <div
                    class="bg-primary text-primary-foreground shadow-popover items-center justify-center rounded border px-1.5 py-1 text-xs font-medium"
                  >
                    {f(
                      new Date(incident.start_date_time * 1000),
                      "MMMM do yyyy, h:mm:ss a",
                      $page.data.selectedLang,
                      $page.data.localTz
                    )}
                    {#if incident.end_date_time}
                      <ArrowRight class="mx-1 -mt-0.5 inline h-3 w-3" />
                      {f(
                        new Date(incident.end_date_time * 1000),
                        "MMMM do yyyy, h:mm:ss a",
                        $page.data.selectedLang,
                        $page.data.localTz
                      )}
                    {:else}
                      <ArrowRight class="mx-1 -mt-0.5 inline h-3 w-3" />
                      <span class="dots-animation inline-block w-6 text-left"></span>
                    {/if}
                  </div>
                </Tooltip.Content>
              </Tooltip.Root>
            {/if}
          </div>
        </Accordion.Trigger>
        <Accordion.Content>
          <div class="px-4 pt-2">
            {#if incident.monitors.length > 0}
              <div class="flex flex-wrap gap-2">
                {#each incident.monitors as monitor}
                  <div class="tag-affected-text bg-secondary flex gap-x-2 rounded-md px-1 py-1 pr-2">
                    <div
                      class="bg-api-{monitor.impact_type.toLowerCase()} text-primary-foreground rounded px-1.5 py-1 text-xs font-semibold"
                    >
                      {monitor.impact_type}
                    </div>
                    {#if monitor.image}
                      <GMI src={monitor.image} classList="mt-1 h-4 w-4" />
                    {/if}
                    <div class="mt-0.5 font-medium">
                      {monitor.name}
                    </div>
                  </div>
                {/each}
              </div>
            {/if}
            <p class="text-muted-foreground my-3 text-xs font-semibold uppercase">
              {l($page.data.lang, "Updates")}
            </p>
            {#if incident.comments.length > 0}
              {#if incidentType == "INCIDENT"}
                <ol class="relative mt-2 pl-14">
                  {#each incident.comments as comment}
                    <li class="relative border-l pb-4 pl-[4.5rem] last:border-0">
                      <div
                        class="bg-secondary absolute top-0 w-28 -translate-x-32 rounded border px-1.5 py-1 text-center text-xs font-semibold"
                      >
                        {l($page.data.lang, comment.state)}
                      </div>

                      <time class=" text-muted-foreground mb-1 text-sm leading-none font-medium">
                        {f(
                          new Date(comment.commented_at * 1000),
                          "MMMM do yyyy, h:mm:ss a",
                          $page.data.selectedLang,
                          $page.data.localTz
                        )}
                      </time>

                      <div class="mb-4 text-sm font-normal">
                        <div
                          class="kener-md prose prose-stone dark:prose-invert prose-code:rounded prose-code:py-[0.2rem] prose-code:font-mono prose-code:text-sm prose-code:font-normal prose-pre:bg-opacity-0 dark:prose-pre:bg-neutral-900 max-w-none"
                        >
                          {@html marked.parse(comment.comment)}
                        </div>
                      </div>
                    </li>
                  {/each}
                </ol>
              {:else if incidentType == "MAINTENANCE"}
                <ol class="relative mt-2 pl-0">
                  {#each incident.comments as comment}
                    <li class="relative pb-2 last:border-0">
                      <time class=" text-muted-foreground mb-1 text-sm leading-none font-medium">
                        {f(
                          new Date(comment.commented_at * 1000),
                          "MMMM do yyyy, h:mm:ss a",
                          $page.data.selectedLang,
                          $page.data.localTz
                        )}
                      </time>

                      <div class="mb-2 text-sm font-normal">
                        <div
                          class="kener-md prose prose-stone dark:prose-invert prose-code:rounded prose-code:py-[0.2rem] prose-code:font-mono prose-code:text-sm prose-code:font-normal prose-pre:bg-opacity-0 dark:prose-pre:bg-neutral-900 max-w-none"
                        >
                          {@html marked.parse(comment.comment)}
                        </div>
                      </div>
                    </li>
                  {/each}
                </ol>
              {/if}
            {:else}
              <p class="text-sm font-medium">
                {l($page.data.lang, "No Updates Yet")}
              </p>
            {/if}
          </div>
        </Accordion.Content>
      </Accordion.Item>
    </Accordion.Root>
  </div>
</div>
