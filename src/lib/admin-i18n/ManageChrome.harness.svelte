<script lang="ts">
  import { untrack } from "svelte";
  import { createAdminI18n } from "./context";
  import type { AdminLocale } from "./messages";
  import * as Sidebar from "$lib/components/ui/sidebar/index.js";
  import SettingsIcon from "@lucide/svelte/icons/settings-2";
  import SiteHeader from "../../routes/(manage)/manage/site-header.svelte";
  import NavMain from "../../routes/(manage)/manage/nav-main.svelte";
  import "../../routes/layout.css";

  let { initialLocale = "pl", collapsed = false }: { initialLocale?: AdminLocale; collapsed?: boolean } = $props();
  const { locale } = createAdminI18n(untrack(() => initialLocale));
  const items = [{ title: "Site Configurations", url: "/manage/app/site-configurations", icon: SettingsIcon }];
</script>

<main lang={$locale} data-testid="admin-main">
  <Sidebar.Provider open={!collapsed} style="--header-height: calc(var(--spacing) * 12);">
    <Sidebar.Root collapsible="icon">
      <NavMain {items} />
    </Sidebar.Root>
    <Sidebar.Inset>
      <SiteHeader title="Site Configurations" />
    </Sidebar.Inset>
  </Sidebar.Provider>
</main>
