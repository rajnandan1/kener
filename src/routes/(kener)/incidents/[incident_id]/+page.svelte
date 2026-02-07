<script lang="ts">
  import { resolve } from "$app/paths";
  import ChevronLeft from "lucide-svelte/icons/chevron-left";
  import Clock from "lucide-svelte/icons/clock";
  import AlertTriangle from "lucide-svelte/icons/alert-triangle";
  import MessageSquare from "lucide-svelte/icons/message-square";
  import Monitor from "lucide-svelte/icons/monitor";
  import ArrowRight from "@lucide/svelte/icons/arrow-right";
  import * as Item from "$lib/components/ui/item/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Card from "$lib/components/ui/card/index.js";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import * as Tooltip from "$lib/components/ui/tooltip/index.js";
  import mdToHTML from "$lib/marked";
  import ThemePlus from "$lib/components/ThemePlus.svelte";
  import constants from "$lib/global-constants.js";
  import CloudAlertIcon from "@lucide/svelte/icons/cloud-alert";
  import { t } from "$lib/stores/i18n";
  import { formatDate, formatDuration } from "$lib/stores/datetime";

  let { data } = $props();

  // Get impact color class
  function getImpactColorClass(impact: string): string {
    switch (impact?.toUpperCase()) {
      case "DOWN":
        return "bg-down";
      case "DEGRADED":
        return "bg-degraded";
      case "MAINTENANCE":
        return "bg-maintenance";
      default:
        return "bg-muted";
    }
  }
</script>

<div class="flex flex-col gap-3">
  <ThemePlus showEventsButton={true} showHomeButton={true} />
  <div class="flex flex-col gap-2 px-4 py-2">
    <Item.Root class="mb-4 px-0">
      <Item.Content class="px-0">
        <Item.Title class="text-3xl">{data.incident.title}</Item.Title>
      </Item.Content>
    </Item.Root>
  </div>
  <div class="grid gap-6 lg:grid-cols-3">
    <!-- Comments Timeline (Main Content) -->
    <div class="lg:col-span-2">
      <div class="bg-background rounded-3xl border">
        <div class="flex items-center justify-between border-b p-4">
          <Badge variant="secondary" class="gap-1">
            <MessageSquare class="h-3 w-3" />
            {$t("Updates (%count)", { count: String(data.comments.length) })}
          </Badge>
        </div>

        {#if data.comments.length === 0}
          <div class="text-muted-foreground p-8 text-center">
            <MessageSquare class="mx-auto mb-2 h-8 w-8 opacity-50" />
            <p>{$t("No updates yet")}</p>
          </div>
        {:else}
          <div class="divide-y">
            {#each data.comments as comment (comment.id)}
              <div class="p-4">
                <div class="mb-2 flex items-center justify-between gap-2">
                  <Badge variant="outline" class="text-{comment.state.toLowerCase()} rounded-none border-0 p-0">
                    {$t(comment.state)}
                  </Badge>
                  <span class="text-muted-foreground text-xs">
                    {$formatDate(comment.commented_at, "PPpp")}
                  </span>
                </div>
                <div class="prose prose-sm dark:prose-invert max-w-none">
                  {@html mdToHTML(comment.comment)}
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    </div>

    <!-- Affected Monitors (Sidebar) -->
    <div class="lg:col-span-1">
      <div class="bg-background rounded-3xl border">
        <div class="flex items-center justify-between border-b p-4">
          <Badge variant="secondary" class="gap-1">
            <Monitor class="h-3 w-3" />
            {$t("Affected Monitors (%count)", { count: String(data.affectedMonitors.length) })}
          </Badge>
        </div>

        {#if data.affectedMonitors.length === 0}
          <div class="text-muted-foreground p-8 text-center">
            <Monitor class="mx-auto mb-2 h-8 w-8 opacity-50" />
            <p>{$t("No monitors affected")}</p>
          </div>
        {:else}
          <div class="">
            {#each data.affectedMonitors as monitor (monitor.monitor_tag)}
              <div class="border-b last:border-b-0">
                <Item.Root>
                  <Item.Media>
                    <Tooltip.Root>
                      <Tooltip.Trigger>
                        <div class="h-6 w-6 rounded-full bg-{monitor.monitor_impact?.toLowerCase()}"></div>
                      </Tooltip.Trigger>
                      <Tooltip.Content arrowClasses="bg-foreground">
                        <div class="text-xs font-medium">
                          {$t("Impact")}: {monitor.monitor_impact || $t("Unknown impact")}
                        </div>
                      </Tooltip.Content>
                    </Tooltip.Root>
                  </Item.Media>
                  <Item.Content>
                    <Item.Title>{monitor.monitor_tag}</Item.Title>
                    <Item.Description>
                      {#if monitor.monitor_impact}
                        <span class="text-{monitor.monitor_impact.toLowerCase()}">
                          {$t(monitor.monitor_impact)}
                        </span>
                      {:else}
                        {$t("Unknown impact")}
                      {/if}
                    </Item.Description>
                  </Item.Content>
                  <Item.Actions>
                    <Button variant="ghost" href={resolve(`/monitors/${monitor.monitor_tag}`)} size="icon">
                      <ArrowRight class="h-4 w-4" />
                    </Button>
                  </Item.Actions>
                </Item.Root>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    </div>
  </div>
</div>
