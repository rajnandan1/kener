<script lang="ts">
  import * as Card from "$lib/components/ui/card/index.js";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import ClockIcon from "@lucide/svelte/icons/clock";
  import Plus from "@lucide/svelte/icons/plus";
  import TagIcon from "@lucide/svelte/icons/tag";
  import ActivityIcon from "@lucide/svelte/icons/activity";
  import SettingsIcon from "@lucide/svelte/icons/settings";
  import { Spinner } from "$lib/components/ui/spinner/index.js";
  import * as Item from "$lib/components/ui/item/index.js";
  import type { MonitorRecord } from "$lib/server/types/db.js";
  import { resolve } from "$app/paths";
  import clientResolver from "$lib/client/resolver.js";

  let monitors = $state<MonitorRecord[]>([]);
  let loading = $state(true);
  let error = $state<string | null>(null);

  async function fetchMonitors() {
    loading = true;
    error = null;
    try {
      const response = await fetch(clientResolver(resolve, "/manage/api"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "getMonitors", data: {} })
      });
      const result = await response.json();
      if (result.error) {
        error = result.error;
      } else {
        monitors = result;
      }
    } catch (e) {
      error = e instanceof Error ? e.message : "Failed to fetch monitors";
    } finally {
      loading = false;
    }
  }

  $effect(() => {
    fetchMonitors();
  });
</script>

<div class="flex w-full flex-col gap-4 p-4">
  <div class="mb-4 flex justify-end">
    <Button class="cursor-pointer" href={clientResolver(resolve, "/manage/app/monitors/new")}>
      <Plus class="size-4" />
      New Monitor
    </Button>
  </div>
  {#if loading}
    <div class="flex w-full flex-col gap-4 [--radius:1rem]">
      <Item.Root variant="muted" class="mx-auto">
        <Item.Media>
          <Spinner />
        </Item.Media>
        <Item.Content>
          <Item.Title class="line-clamp-1">Loading Monitors....</Item.Title>
        </Item.Content>
        <Item.Content class="flex-none justify-end"></Item.Content>
      </Item.Root>
    </div>
  {:else if error}
    <div class="text-destructive py-8 text-center">
      {error}
    </div>
  {:else if monitors.length === 0}
    <div class="text-muted-foreground py-8 text-center">
      No monitors found. Create your first monitor to get started.
    </div>
  {:else}
    <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
      {#each monitors as monitor (monitor.id)}
        <Card.Root class="w-full">
          <Card.Header>
            <div class="flex items-center gap-3">
              {#if monitor.image}
                <img
                  src={clientResolver(resolve, monitor.image)}
                  alt={monitor.name}
                  class="size-10 rounded-md object-cover"
                />
              {:else}
                <div class="bg-muted flex size-10 items-center justify-center rounded-md">
                  <ActivityIcon class="text-muted-foreground size-5" />
                </div>
              {/if}
              <div class="flex-1">
                <Card.Title class="text-lg">{monitor.name}</Card.Title>
                {#if monitor.description}
                  <Card.Description class="line-clamp-2">{monitor.description}</Card.Description>
                {/if}
              </div>
            </div>
          </Card.Header>
          <Card.Content>
            <div class="flex flex-wrap gap-2">
              {#if monitor.cron}
                <Badge variant="outline" class="gap-1">
                  <ClockIcon class="size-3" />
                  {monitor.cron}
                </Badge>
              {/if}
              {#if monitor.monitor_type}
                <Badge variant="secondary">{monitor.monitor_type}</Badge>
              {/if}
              <Badge variant="outline" class="gap-1">
                <TagIcon class="size-3" />
                {monitor.tag}
              </Badge>
              {#if monitor.status}
                <Badge variant={monitor.status === "ACTIVE" ? "default" : "destructive"}>
                  {monitor.status}
                </Badge>
              {/if}
            </div>
          </Card.Content>
          <Card.Footer class="flex justify-end gap-2">
            <Button variant="outline" size="sm" href={clientResolver(resolve, `/manage/app/monitors/${monitor.tag}`)}>
              <SettingsIcon class="mr-1 size-4" />
              Configure
            </Button>
          </Card.Footer>
        </Card.Root>
      {/each}
    </div>
  {/if}
</div>
