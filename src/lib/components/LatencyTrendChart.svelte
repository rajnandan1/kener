<script lang="ts">
  import { AreaChart, Area, LinearGradient } from "layerchart";
  import { curveCatmullRom } from "d3-shape";
  import { scaleTime } from "d3-scale";
  import * as Chart from "$lib/components/ui/chart/index.js";
  import { t } from "$lib/stores/i18n";
  import { FormatValue, IsCustomUnit } from "$lib/clientTools";
  import { formatDate } from "$lib/stores/datetime";
  import { page } from "$app/state";
  import type { MonitorValueDisplay } from "$lib/server/types/db";

  interface ChartPoint {
    date: Date;
    value: number;
  }

  interface Props {
    data: ChartPoint[];
    label?: string;
    height?: number;
    class?: string;
    valueDisplay?: MonitorValueDisplay | null;
  }

  let { data, label = $t("Avg Latency"), height = 128, class: className = "", valueDisplay = null }: Props = $props();

  let customName = $derived(valueDisplay?.name?.trim() || "");

  // Chart config
  let chartConfig = $derived({
    value: {
      label: label,
      color: "var(--chart-1)"
    }
  } satisfies Chart.ChartConfig);

  // Filter out zero values
  let chartData = $derived(IsCustomUnit(valueDisplay) ? data : data.filter((d) => d.value > 0));
</script>

<div class="{className}  ">
  {#if chartData.length > 0}
    <Chart.Container config={chartConfig} class="w-full" style="height: {height}px;">
      <AreaChart
        data={chartData}
        x="date"
        xScale={scaleTime()}
        y="value"
        yDomain={[0, null]}
        yNice
        axis="x"
        grid={false}
        series={[
          {
            key: "value",
            label: label,
            color: "var(--color-value)"
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
                    >{item.payload?.date
                      ? $formatDate(item.payload.date, page.data.dateAndTimeFormat.dateOnly)
                      : ""}</span
                  >
                  <div class="flex items-center gap-2">
                    <span class="text-foreground font-mono font-medium tabular-nums">
                      {FormatValue(Number(value), valueDisplay)}
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
      <p class="text-muted-foreground text-sm">
        {customName
          ? $t("No %name data available for this day", { name: customName })
          : $t("No latency data available for this day")}
      </p>
    </div>
  {/if}
</div>
