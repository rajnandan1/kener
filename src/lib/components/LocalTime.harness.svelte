<!-- Test-only: LocalTime needs the Tooltip.Provider that app layouts supply. -->
<script lang="ts">
  import { untrack } from "svelte";
  import { createAdminI18n } from "$lib/admin-i18n/context";
  import type { AdminLocale } from "$lib/admin-i18n/messages";
  import LanguageSwitcher from "$lib/admin-i18n/LanguageSwitcher.svelte";
  import * as Tooltip from "$lib/components/ui/tooltip/index.js";
  import LocalTime from "./LocalTime.svelte";

  let {
    value,
    format,
    initialLocale
  }: { value: Date | string | number; format?: string; initialLocale?: AdminLocale } = $props();
  const requestedLocale = untrack(() => initialLocale);
  if (requestedLocale) createAdminI18n(requestedLocale);
</script>

{#if initialLocale}
  <LanguageSwitcher />
{/if}

<Tooltip.Provider>
  <LocalTime {value} {format} />
</Tooltip.Provider>
