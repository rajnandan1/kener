<script lang="ts">
  import * as Select from "$lib/components/ui/select/index.js";
  import GC from "$lib/global-constants.js";
  import type { PageMonitorLayoutStyle } from "$lib/types/api";
  import { MONITOR_LAYOUT_STYLE_LABELS, ResolveMonitorLayoutStyle } from "$lib/monitorLayout";

  // The List/Grid choice for a list of monitors: a page's monitors, or a group monitor's members.
  interface Props {
    value: PageMonitorLayoutStyle;
    id?: string;
  }

  let { value = $bindable(), id }: Props = $props();
</script>

<Select.Root type="single" bind:value>
  <Select.Trigger {id} class="w-full">
    {MONITOR_LAYOUT_STYLE_LABELS[ResolveMonitorLayoutStyle(value)]}
  </Select.Trigger>
  <Select.Content>
    {#each GC.MONITOR_LAYOUT_STYLES as style (style)}
      <Select.Item value={style}>{MONITOR_LAYOUT_STYLE_LABELS[style]}</Select.Item>
    {/each}
  </Select.Content>
</Select.Root>
