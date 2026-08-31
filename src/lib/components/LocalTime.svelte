<script lang="ts">
  import * as Tooltip from "$lib/components/ui/tooltip/index.js";
  import { format as fmt, isValid } from "date-fns";
  import { formatInTimeZone } from "date-fns-tz";
  import { parseDateInput } from "$lib/stores/datetime";

  interface Props {
    /** Audit column (Date, ISO or naive "YYYY-MM-DD HH:mm:ss" string) or event time (epoch seconds). */
    value: Date | string | number;
    /** date-fns format for the local time. */
    format?: string;
    class?: string;
  }

  let { value, format = "yyyy-MM-dd HH:mm:ss", class: className }: Props = $props();

  const date = $derived(parseDateInput(value));
  const local = $derived(isValid(date) ? `${fmt(date, format)} ${fmt(date, "O")}` : null);
</script>

<!-- Needs a Tooltip.Provider above it; the (manage) and (kener) layouts supply one. -->
{#if local}
  <Tooltip.Root>
    <Tooltip.Trigger class={className}>{local}</Tooltip.Trigger>
    <Tooltip.Content>
      {formatInTimeZone(date, "UTC", "yyyy-MM-dd HH:mm:ss 'UTC'")}
    </Tooltip.Content>
  </Tooltip.Root>
{:else}
  <span class={className}>{String(value ?? "")}</span>
{/if}
