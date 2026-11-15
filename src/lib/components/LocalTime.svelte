<script lang="ts">
  import { getAdminI18n } from "$lib/admin-i18n/context";
  import { enGB, pl } from "date-fns/locale";
  const { locale, active } = getAdminI18n();
  const dateLocale = $derived(active ? ($locale === "pl" ? pl : enGB) : undefined);
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
  const local = $derived(isValid(date) ? `${fmt(date, format, { locale: dateLocale })} ${fmt(date, "O")}` : null);
</script>

<!-- Needs a Tooltip.Provider above it; the (manage) and (kener) layouts supply one. -->
{#if local}
  <Tooltip.Root>
    <Tooltip.Trigger class={className}>{local}</Tooltip.Trigger>
    <Tooltip.Content>
      {formatInTimeZone(date, "UTC", "yyyy-MM-dd HH:mm:ss 'UTC'", { locale: dateLocale })}
    </Tooltip.Content>
  </Tooltip.Root>
{:else}
  <span class={className}>{String(value ?? "")}</span>
{/if}
