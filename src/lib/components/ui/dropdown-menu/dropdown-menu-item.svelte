<script lang="ts">
  import { cn } from "$lib/utils.js";
  import { DropdownMenu as DropdownMenuPrimitive } from "bits-ui";

  let {
    ref = $bindable(null),
    class: className,
    inset,
    variant = "default",
    ...restProps
  }: DropdownMenuPrimitive.ItemProps & {
    inset?: boolean;
    variant?: "default" | "destructive";
  } = $props();
</script>

<DropdownMenuPrimitive.Item
  bind:ref
  data-slot="dropdown-menu-item"
  data-inset={inset}
  data-variant={variant}
  class={cn(
    "relative flex cursor-default items-center gap-3 rounded-lg px-3 py-2.5 text-sm outline-hidden select-none text-zinc-300 data-highlighted:bg-zinc-900 data-highlighted:text-zinc-50 data-[variant=destructive]:text-red-300 data-[variant=destructive]:data-highlighted:bg-red-950/40 data-[variant=destructive]:data-highlighted:text-red-200 data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[inset]:ps-8 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
    className
  )}
  {...restProps}
/>
