<script lang="ts">
  import { resolve } from "$app/paths";
  import MessageSquare from "@lucide/svelte/icons/message-square";
  import Monitor from "@lucide/svelte/icons/monitor";
  import ArrowRight from "@lucide/svelte/icons/arrow-right";
  import * as Item from "$lib/components/ui/item/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import * as Tooltip from "$lib/components/ui/tooltip/index.js";
  import mdToHTML from "$lib/marked";
  import ThemePlus from "$lib/components/ThemePlus.svelte";
  import { SveltePurify } from "@humanspeak/svelte-purify";
  import { t } from "$lib/stores/i18n";
  import { formatDate } from "$lib/stores/datetime";
  import clientResolver from "$lib/client/resolver.js";
  import { page } from "$app/state";

  let { data } = $props();
</script>

<svelte:head>
  <title>{data.incident.title + " - " + data.siteName}</title>
  <meta property="og:title" content={data.incident.title + " - " + data.siteName} />
  <meta property="og:type" content="article" />
  <meta name="twitter:card" content="summary_large_image" />
  {#if data.comments.length > 0}
    <meta name="description" content={data.comments[0].comment} />
    <meta property="og:description" content={data.comments[0].comment} />
  {/if}
  {#if data.socialPreviewImage}
    <meta property="og:image" content={clientResolver(resolve, data.socialPreviewImage)} />
    <meta name="twitter:image" content={clientResolver(resolve, data.socialPreviewImage)} />
  {/if}
</svelte:head>

<div class="flex flex-col gap-3">
  <ThemePlus />
  <div class="flex flex-col gap-2 px-4 py-2">
    <Item.Root class="mb-4 px-0">
      <Item.Content class="min-w-0 flex-1 px-0">
        <h1>
          <Item.Title class="text-3xl wrap-break-word">{data.incident.title}</Item.Title>
        </h1>
      </Item.Content>
    </Item.Root>
  </div>
  <div class="grid min-w-0 gap-6 lg:grid-cols-3">
    <!-- Comments Timeline (Main Content) -->
    <div class="min-w-0 lg:col-span-2">
      <div class="bg-background min-w-0 rounded-3xl border">
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
              <div class="min-w-0 p-4">
                <div class="mb-2 flex items-center justify-between gap-2">
                  <Badge variant="outline" class="text-{comment.state.toLowerCase()} rounded-none border-0 p-0">
                    {$t(comment.state)}
                  </Badge>
                  <span class="text-muted-foreground text-xs">
                    {$formatDate(comment.commented_at, page.data.dateAndTimeFormat.datePlusTime)}
                  </span>
                </div>
                <div class="prose prose-sm dark:prose-invert max-w-none min-w-0 overflow-x-auto wrap-break-word">
                  <SveltePurify html={mdToHTML(comment.comment)} />
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
                    <Item.Title>{monitor.monitor_name}</Item.Title>
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
                    <Button
                      variant="outline"
                      href={clientResolver(resolve, `/monitors/${monitor.monitor_tag}`)}
                      class="rounded-btn"
                      size="icon"
                    >
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
