<script lang="ts">
  import { AreaChart, Area, LinearGradient } from "layerchart";
  import { curveCatmullRom } from "d3-shape";
  import { scaleTime } from "d3-scale";
  import * as Chart from "$lib/components/ui/chart/index.js";
  import type { TimestampStatusCount } from "$lib/server/types/db";
  import { t } from "$lib/stores/i18n";
  import { ta } from "date-fns/locale";
  import { ParseLatency } from "$lib/clientTools";
  import { formatDate } from "$lib/stores/datetime";

  interface Props {
    data: TimestampStatusCount[];
    height?: number;
    class?: string;
  }

  let { data, height = 128, class: className = "" }: Props = $props();

  // Chart config
  const chartConfig = {
    avgLatency: {
      label: $t("Avg Latency"),
      color: "var(--chart-1)"
    }
  } satisfies Chart.ChartConfig;

  // Transform data for chart
  let chartData = $derived.by(() => {
    if (!data) return [];
    return data
      .filter((d) => d.avgLatency > 0)
      .map((d) => ({
        date: new Date(d.ts * 1000),
        avgLatency: d.avgLatency
      }));
  });
</script>

<div class="{className}  ">
  {#if chartData.length > 0}
    <Chart.Container config={chartConfig} class="w-full" style="height: {height}px;">
      <AreaChart
        data={chartData}
        x="date"
        xScale={scaleTime()}
        y="avgLatency"
        yDomain={[0, null]}
        yNice
        axis="x"
        grid={false}
        series={[
          {
            key: "avgLatency",
            label: $t("Avg Latency"),
            color: "var(--color-avgLatency)"
          }
        ]}
        props={{
          area: {
            curve: curveCatmullRom,
            "fill-opacity": 0.4,
            line: { class: "stroke-1" }
          },
          xAxis: {
            format: (d: Date) => $formatDate(d, "MMM d")
          }
        }}
      >
        {#snippet marks({ series, getAreaProps })}
          {#each series as s, i (s.key)}
            <LinearGradient stops={[s.color ?? "", "color-mix(in lch, " + s.color + " 10%, transparent)"]} vertical>
              {#snippet children({ gradient })}
                <Area {...getAreaProps(s, i)} fill={gradient} />
              {/snippet}
            </LinearGradient>
          {/each}
        {/snippet}
        {#snippet tooltip()}
          <Chart.Tooltip hideLabel>
            {#snippet formatter({ value, name, item })}
              <div class="flex w-full items-start gap-2">
                <div
                  style="--color-bg: {item.color}; --color-border: {item.color};"
                  class="mt-0.5 size-2.5 shrink-0 rounded-[2px] border-(--color-border) bg-(--color-bg)"
                ></div>
                <div class="flex flex-1 flex-col items-start justify-between gap-1 leading-none">
                  <span class="text-muted-foreground text-xs"
                    >{item.payload?.date ? $formatDate(item.payload.date, "MMM d") : ""}</span
                  >
                  <div class="flex items-center gap-2">
                    <span class="text-foreground font-mono font-medium tabular-nums">
                      {ParseLatency(Number(value))}
                    </span>
                  </div>
                </div>
              </div>
            {/snippet}
          </Chart.Tooltip>
        {/snippet}
      </AreaChart>
    </Chart.Container>
  {:else}
    <div class="flex items-center justify-center" style="height: {height}px;">
      <p class="text-muted-foreground text-sm">{$t("No latency data available for this day")}</p>
    </div>
  {/if}
</div>
