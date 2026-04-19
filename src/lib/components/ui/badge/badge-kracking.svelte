<script module lang="ts">
  /*
   * Console-style Badge.
   *
   * Pixel-for-pixel match of the Console's `badge.component.svelte`:
   * `rounded-md px-2 py-0.5 text-[11px] font-medium leading-4` with a
   * six-tone palette (`amber / blue / emerald / red / rose / zinc`).
   * Used on Kener's public surfaces (status chips on monitor rows,
   * incident / maintenance state chips, etc.) so they read identically
   * to the Console's resource-status badges.
   *
   * The existing shadcn `Badge` primitive (./badge.svelte) is kept for
   * manage / docs screens that already rely on its `default / secondary
   * / destructive / outline` variant API — this file is an additive
   * primitive, not a replacement.
   */
  export type BadgeTone = "amber" | "blue" | "emerald" | "red" | "rose" | "zinc";
</script>

<script lang="ts">
  import type { Snippet } from "svelte";

  interface Props {
    children?: Snippet;
    class?: string;
    tone?: BadgeTone;
  }

  let { children, class: className = "", tone = "zinc" }: Props = $props();

  const toneClassNames: Record<BadgeTone, string> = {
    amber: "bg-amber-500/10 text-amber-300",
    blue: "bg-blue-500/10 text-blue-300",
    emerald: "bg-emerald-500/10 text-emerald-300",
    red: "bg-red-500/10 text-red-300",
    rose: "bg-rose-500/10 text-rose-300",
    zinc: "bg-zinc-800 text-zinc-300"
  };
</script>

<span
  class={`inline-flex max-w-full min-w-0 items-center justify-center overflow-hidden whitespace-nowrap rounded-md px-2 py-0.5 text-[11px] font-medium leading-4 ${toneClassNames[tone]} ${className}`.trim()}
>
  {@render children?.()}
</span>
