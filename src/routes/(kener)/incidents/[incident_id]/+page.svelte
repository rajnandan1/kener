<script lang="ts">
  import { resolve } from "$app/paths";
  import { IconMessageCircle, IconServer, IconArrowRight } from "@tabler/icons-svelte";
  import * as Item from "$lib/components/ui/item/index.js";
  import * as Tooltip from "$lib/components/ui/tooltip/index.js";
  import mdToHTML from "$lib/marked";
  import ThemePlus from "$lib/components/ThemePlus.svelte";
  import { SveltePurify } from "@humanspeak/svelte-purify";
  import { t } from "$lib/stores/i18n";
  import { formatDate, formatDuration } from "$lib/stores/datetime";
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

<div class="public-page">
  <ThemePlus />
  <div class="public-intro">
    <p class="public-kicker">Incident Report</p>
    <Item.Root class="mb-4 px-0">
      <Item.Content class="min-w-0 flex-1 px-0">
        <h1>
          <Item.Title class="public-title wrap-break-word">{data.incident.title}</Item.Title>
        </h1>
      </Item.Content>
    </Item.Root>
  </div>
  <div class="grid min-w-0 gap-6 lg:grid-cols-3">
    <!-- Comments Timeline (Main Content) -->
    <div class="min-w-0 lg:col-span-2">
      <div class="public-panel min-w-0">
        <div class="flex items-center justify-between gap-3 border-b border-zinc-800 px-4 py-3">
          <div class="flex items-center gap-2 text-[13px] font-medium text-zinc-300">
            <IconMessageCircle class="size-3.5 shrink-0 text-zinc-500" aria-hidden="true" />
            <span>{$t("Updates (%count)", { count: String(data.comments.length) })}</span>
          </div>
        </div>

        {#if data.comments.length === 0}
          <div class="flex flex-col items-center gap-2 px-6 py-10 text-center text-zinc-500">
            <IconMessageCircle class="size-7 opacity-60" aria-hidden="true" />
            <p class="text-[13px]">{$t("No updates yet")}</p>
          </div>
        {:else}
          <div class="divide-y divide-zinc-800">
            {#each data.comments as comment (comment.id)}
              <div class="min-w-0 p-4">
                <div class="mb-2 flex items-center justify-between gap-2">
                  <span class="inline-flex items-center gap-1.5 text-[12px] font-medium text-{comment.state.toLowerCase()}">
                    <span class="inline-flex size-1.5 shrink-0 rounded-full bg-{comment.state.toLowerCase()}"></span>
                    {$t(comment.state)}
                  </span>
                  <span class="text-[11px] text-zinc-500">
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
      <div class="public-panel">
        <div class="flex items-center justify-between gap-3 border-b border-zinc-800 px-4 py-3">
          <div class="flex items-center gap-2 text-[13px] font-medium text-zinc-300">
            <IconServer class="size-3.5 shrink-0 text-zinc-500" aria-hidden="true" />
            <span>{$t("Affected Monitors (%count)", { count: String(data.affectedMonitors.length) })}</span>
          </div>
        </div>

        {#if data.affectedMonitors.length === 0}
          <div class="flex flex-col items-center gap-2 px-6 py-10 text-center text-zinc-500">
            <IconServer class="size-7 opacity-60" aria-hidden="true" />
            <p class="text-[13px]">{$t("No monitors affected")}</p>
          </div>
        {:else}
          <div class="divide-y divide-zinc-800">
            {#each data.affectedMonitors as monitor (monitor.monitor_tag)}
              <Item.Root class="px-4 py-3">
                <Item.Media>
                  <Tooltip.Root>
                    <Tooltip.Trigger>
                      <div class="size-6 rounded-full bg-{monitor.monitor_impact?.toLowerCase()}"></div>
                    </Tooltip.Trigger>
                    <Tooltip.Content arrowClasses="bg-foreground">
                      <div class="text-[12px] font-medium">
                        {$t("Impact")}: {monitor.monitor_impact || $t("Unknown impact")}
                      </div>
                    </Tooltip.Content>
                  </Tooltip.Root>
                </Item.Media>
                <Item.Content>
                  <Item.Title class="text-[13px] font-medium text-zinc-100">{monitor.monitor_name}</Item.Title>
                  <Item.Description class="text-[12px] text-zinc-500">
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
                  <div class="rounded-lg border border-zinc-800 bg-zinc-900 p-1.5 text-zinc-500">
                    <IconArrowRight class="size-3.5" />
                  </div>
                </Item.Actions>
              </Item.Root>
            {/each}
          </div>
        {/if}
      </div>
    </div>
  </div>
</div>
