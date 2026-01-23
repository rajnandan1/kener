<script lang="ts">
  import { Button } from "$lib/components/ui/button/index.js";
  import { UseClipboard } from "$lib/hooks/use-clipboard.svelte.js";
  import Check from "@lucide/svelte/icons/check";
  import type { Snippet } from "svelte";

  interface Props {
    variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
    size?: "default" | "sm" | "lg" | "icon" | "icon-sm";
    text?: string;
    onclick?: () => void;
    children?: Snippet;
    class?: string;
  }

  let { variant = "outline", size = "icon-sm", text, onclick, children, class: className }: Props = $props();

  const clipboard = new UseClipboard({ delay: 1000 });

  async function handleClick() {
    if (text) {
      await clipboard.copy(text);
    }
    if (onclick) {
      onclick();
    }
  }
</script>

<Button {variant} {size} class="{className} relative cursor-pointer" onclick={handleClick}>
  <span
    class="absolute flex items-center transition-all duration-200 ease-out {clipboard.copied
      ? 'scale-100 opacity-100'
      : 'pointer-events-none scale-75 opacity-0'}"
  >
    <Check class="h-4 w-4 stroke-green-500" />
  </span>
  <span
    class="flex items-center transition-all duration-200 ease-out {clipboard.copied
      ? 'pointer-events-none scale-75 opacity-0'
      : 'scale-100 opacity-100'}"
  >
    {#if children}
      {@render children()}
    {/if}
  </span>
  <span
    class="bg-popover text-popover-foreground absolute bottom-full left-1/2 mb-2 origin-bottom -translate-x-1/2 rounded-md border px-2 py-1 text-xs shadow-md transition-all duration-200 ease-out {clipboard.copied
      ? 'scale-100 opacity-100'
      : 'pointer-events-none scale-75 opacity-0'}"
  >
    Copied
  </span>
</Button>
