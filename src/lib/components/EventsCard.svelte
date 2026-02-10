<script lang="ts">
  import Check from "@lucide/svelte/icons/check";
  import type { PageSettingsType } from "$lib/server/types/db";
  import { t } from "$lib/stores/i18n";

  interface Props {
    statusClass: string;
    statusText: string;
  }

  let { statusClass, statusText }: Props = $props();
  // Compute change info (direction, color, and formatted value)
</script>

<div class="flex flex-col gap-3 lg:flex-row">
  <div class="flex min-h-20 w-full flex-row justify-start gap-y-3 rounded-3xl border p-4 lg:w-full lg:min-w-72">
    <div class="flex w-full flex-row items-center gap-4">
      <div class="relative flex justify-between">
        <span class="relative flex size-4">
          <span class="{statusClass} absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"></span>
          <span class="{statusClass} relative inline-flex size-4 rounded-full"></span>
        </span>
      </div>
      <div class="flex min-w-0 flex-col items-start gap-2">
        <p class="text-xl leading-tight wrap-break-word sm:text-2xl">{$t(statusText)}</p>
      </div>
    </div>
  </div>
</div>
