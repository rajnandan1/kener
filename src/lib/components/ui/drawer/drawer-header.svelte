<script lang="ts">
	import type { HTMLAttributes } from "svelte/elements";
	import { cn, type WithElementRef } from "$lib/utils.js";

	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLDivElement>> = $props();
</script>

<div
	bind:this={ref}
	data-slot="drawer-header"
	class={cn("flex items-center gap-3 border-b dark:border-zinc-800 border-zinc-200 px-4 py-2", className)}
	{...restProps}
>
	{@render children?.()}
</div>
