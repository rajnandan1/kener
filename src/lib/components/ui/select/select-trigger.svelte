<script lang="ts">
  import { Select as SelectPrimitive } from "bits-ui";
  import { IconChevronDown } from "@tabler/icons-svelte";
  import { cn, type WithoutChild } from "$lib/utils.js";

  let {
    ref = $bindable(null),
    class: className,
    children,
    size = "default",
    ...restProps
  }: WithoutChild<SelectPrimitive.TriggerProps> & {
    size?: "sm" | "default";
  } = $props();
</script>

<SelectPrimitive.Trigger
  bind:ref
  data-slot="select-trigger"
  data-size={size}
  class={cn(
    "flex w-fit items-center justify-between gap-3 rounded-lg border bg-zinc-900/70 px-3 text-sm whitespace-nowrap outline-none transition-[border-color,background-color,box-shadow] duration-150 ease-out select-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50 data-[size=default]:h-10 data-[size=sm]:h-9 data-[placeholder]:text-zinc-500 *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-2 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 border-zinc-800 text-zinc-100 hover:border-zinc-700 focus-visible:border-blue-500/70 focus-visible:ring-blue-500",
    className
  )}
  {...restProps}
>
  {@render children?.()}
  <IconChevronDown class="h-4 w-4 shrink-0 text-zinc-500" />
</SelectPrimitive.Trigger>
