<script lang="ts">
  import { untrack } from "svelte";
  import { createAdminI18n } from "$lib/admin-i18n/context";
  import type { AdminLocale } from "$lib/admin-i18n/messages";
  import AccountHeader from "./AccountHeader.svelte";
  import KenerNav from "./KenerNav.svelte";
  import "../../routes/layout.css";

  let { initialLocale = "pl", publicNavigation = false }: { initialLocale?: AdminLocale; publicNavigation?: boolean } =
    $props();
  createAdminI18n(untrack(() => initialLocale));
</script>

{#if publicNavigation}
  <KenerNav />
{:else}
  <AccountHeader />
{/if}
