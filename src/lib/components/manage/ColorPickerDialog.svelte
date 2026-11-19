<script lang="ts">
  import type { Snippet } from "svelte";
  import { getAdminI18n } from "$lib/admin-i18n/context";

  interface Props {
    wrapper: HTMLElement | undefined;
    isOpen: boolean;
    isDialog: boolean;
    children: Snippet;
  }

  const { t: adminT } = getAdminI18n();
  let { wrapper = $bindable(), isOpen, isDialog, children }: Props = $props();
</script>

<div
  bind:this={wrapper}
  data-slot="color-picker-dialog"
  class="mx-2.5 mb-2.5 w-max rounded-[12px] border border-[var(--cp-border-color,black)] bg-[var(--cp-bg-color,white)] p-2"
  style:display={isOpen ? "inline-block" : "none"}
  style:color="var(--cp-text-color, var(--cp-border-color, black))"
  style:position={isDialog ? "absolute" : undefined}
  style:top={isDialog ? "calc(var(--input-size, 25px) + 12px)" : undefined}
  style:left={isDialog ? "0px" : undefined}
  style:z-index={isDialog ? "var(--picker-z-index, 2)" : undefined}
  role={isDialog ? "dialog" : undefined}
  aria-label={isDialog ? $adminT("Color picker") : undefined}
>
  {@render children()}
</div>
