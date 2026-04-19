<script lang="ts">
	import { Dialog as DialogPrimitive } from "bits-ui";
	import DialogPortal from "./dialog-portal.svelte";
	/*
	 * Close icon comes from `@tabler/icons-svelte` (the Console's icon
	 * set) so the Kener dialog matches the Console's dialog primitive
	 * pixel-for-pixel: 14 px IconX, 90% opacity, inside a size-7
	 * rounded-lg hover chip that lights to `bg-zinc-800/60` on hover.
	 * See `apps/web/src/lib/ui/components/dialog.component.svelte:110`
	 * in the Console repo for the reference implementation.
	 */
	import { IconX } from "@tabler/icons-svelte";
	import type { Snippet } from "svelte";
	import * as Dialog from "./index.js";
	import { cn, type WithoutChildrenOrChild } from "$lib/utils.js";
	import type { ComponentProps } from "svelte";

	let {
		ref = $bindable(null),
		class: className,
		portalProps,
		children,
		/*
		 * Default `true` — every Kener dialog now shows the same close
		 * affordance the Console uses. Consumers that explicitly want a
		 * close-less modal (e.g. a forced step) can still pass `false`.
		 */
		showCloseButton = true,
		...restProps
	}: WithoutChildrenOrChild<DialogPrimitive.ContentProps> & {
		portalProps?: WithoutChildrenOrChild<ComponentProps<typeof DialogPortal>>;
		children: Snippet;
		showCloseButton?: boolean;
	} = $props();
</script>

<DialogPortal {...portalProps}>
	<Dialog.Overlay />
	<DialogPrimitive.Content
		bind:ref
		data-slot="dialog-content"
		class={cn(
			"fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-xl border border-zinc-800 bg-zinc-950 p-6 shadow-(--shadow-overlay) transition-all duration-200 ease-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:max-w-lg",
			className
		)}
		{...restProps}
	>
		{@render children?.()}
		{#if showCloseButton}
			<DialogPrimitive.Close
				aria-label="Close dialog"
				class="dialog-close-btn absolute end-4 top-4 inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-lg text-zinc-500 transition-colors duration-150 ease-out hover:bg-zinc-800/60 hover:text-zinc-100 focus-visible:bg-zinc-800/60 focus-visible:text-zinc-100 focus-visible:outline-none disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0"
			>
				<IconX size={14} class="opacity-90" />
				<span class="sr-only">Close</span>
			</DialogPrimitive.Close>
		{/if}
	</DialogPrimitive.Content>
</DialogPortal>
