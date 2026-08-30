<!-- Test-only: LocalTime needs the Tooltip.Provider that app layouts supply. -->
<script lang="ts">
  import * as Tooltip from "$lib/components/ui/tooltip/index.js";
  import LocalTime from "./LocalTime.svelte";

  let { value, format }: { value: Date | string | number; format?: string } = $props();
</script>

<Tooltip.Provider>
  <LocalTime {value} {format} />
</Tooltip.Provider>
