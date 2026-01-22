<script lang="ts">
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Table from "$lib/components/ui/table/index.js";
  import { Skeleton } from "$lib/components/ui/skeleton/index.js";
  import type { MonitorTableRow } from "$lib/types/common";
  import { onMount } from "svelte";
  import ArrowRight from "@lucide/svelte/icons/arrow-right";

  interface Props {
    monitorTags: string[];
    nowTimestamp: number;
  }
  let { monitorTags, nowTimestamp }: Props = $props();

  let loading = $state(true);
  let monitorData = $state<MonitorTableRow[]>([]);

  onMount(async () => {
    try {
      const response = await fetch("/dashboard-apis/monitor-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ monitor_tags: monitorTags, now_ts: nowTimestamp })
      });
      if (response.ok) {
        monitorData = await response.json();
      }
    } catch (e) {
      console.error("Failed to fetch monitor data:", e);
    } finally {
      loading = false;
    }
  });
</script>

<div class="overflow-hidden rounded-3xl border">
  <Table.Root class="ktable">
    <Table.Header class="h-12">
      <Table.Row>
        <Table.Head class="w-40">Name</Table.Head>
        <Table.Head>Status</Table.Head>
        <Table.Head>Response Time</Table.Head>
        <Table.Head class="text-center">24h</Table.Head>
        <Table.Head class="text-center">7d</Table.Head>
        <Table.Head class="text-center">30d</Table.Head>
        <Table.Head class="text-center">90d</Table.Head>
        <Table.Head class="text-right"></Table.Head>
      </Table.Row>
    </Table.Header>
    <Table.Body>
      {#if loading}
        {#each Array(monitorTags.length) as _, index}
          <Table.Row>
            <Table.Cell class="font-medium">
              <Skeleton class="h-4 w-24" />
            </Table.Cell>
            <Table.Cell><Skeleton class="h-4 w-16" /></Table.Cell>
            <Table.Cell><Skeleton class="h-4 w-16" /></Table.Cell>
            <Table.Cell><Skeleton class="mx-auto h-4 w-8" /></Table.Cell>
            <Table.Cell><Skeleton class="mx-auto h-4 w-8" /></Table.Cell>
            <Table.Cell><Skeleton class="mx-auto h-4 w-8" /></Table.Cell>
            <Table.Cell><Skeleton class="mx-auto h-4 w-8" /></Table.Cell>
            <Table.Cell><Skeleton class="h-4 w-16" /></Table.Cell>
          </Table.Row>
        {/each}
      {:else}
        {#each monitorData as monitor}
          <Table.Row>
            <Table.Cell class="font-medium">{monitor.name}</Table.Cell>
            <Table.Cell class="font-medium text-{monitor.status.toLowerCase()}">{monitor.status}</Table.Cell>
            <Table.Cell>{monitor.responseTime}</Table.Cell>
            <Table.Cell class="text-center">{monitor.uptimes[0]?.percentage ?? "-"}%</Table.Cell>
            <Table.Cell class="text-center">{monitor.uptimes[1]?.percentage ?? "-"}%</Table.Cell>
            <Table.Cell class="text-center">{monitor.uptimes[2]?.percentage ?? "-"}%</Table.Cell>
            <Table.Cell class="text-center">{monitor.uptimes[3]?.percentage ?? "-"}%</Table.Cell>
            <Table.Cell class="text-center">
              <Button variant="ghost" size="icon">
                <ArrowRight />
              </Button>
            </Table.Cell>
          </Table.Row>
        {/each}
      {/if}
    </Table.Body>
  </Table.Root>
</div>
