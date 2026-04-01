<script lang="ts">
  import { t } from "$lib/stores/i18n";

  interface Props {
    statusClass: string;
    statusText: string;
  }

  let { statusClass, statusText }: Props = $props();
  // Compute change info (direction, color, and formatted value)
</script>

<div class="flex flex-col gap-3 lg:flex-row">
  <div class="flex w-full flex-row justify-start gap-y-3 lg:w-full lg:min-w-72">
    <div class="flex w-full flex-row items-center justify-end gap-2">
      <div class="inline-flex min-w-0 items-center gap-2 rounded-full bg-zinc-900/80 px-3 py-1.5 ring-1 ring-zinc-800/90">
        <span class="{statusClass} inline-flex size-2.5 shrink-0 rounded-full shadow-[0_0_14px_currentColor]"></span>
        <p class="text-sm leading-tight font-medium text-zinc-100 wrap-break-word">{$t(statusText)}</p>
      </div>
    </div>
  </div>
</div>
