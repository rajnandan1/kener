<script lang="ts">
  import { Tabs as TabsPrimitive } from "bits-ui";
  import { cn } from "$lib/utils.js";

  let { ref = $bindable(null), class: className, ...restProps }: TabsPrimitive.ListProps = $props();
</script>

<TabsPrimitive.List
  bind:ref
  data-slot="tabs-list"
  class={cn(
    "inline-flex h-9 w-fit items-center justify-center gap-1 rounded-lg bg-zinc-900/50 p-1 text-zinc-400 outline-none",
    className
  )}
  {...restProps}
/>
