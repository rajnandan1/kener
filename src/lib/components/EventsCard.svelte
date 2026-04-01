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
      <div class="min-w-0 flex items-center gap-2">
        <span class="{statusClass} inline-flex size-2 rounded-full"></span>
        <p class="text-sm leading-tight font-medium wrap-break-word sm:text-base">{$t(statusText)}</p>
      </div>
    </div>
  </div>
</div>
