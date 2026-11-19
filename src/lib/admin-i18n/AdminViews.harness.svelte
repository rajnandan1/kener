<script lang="ts">
  import { createAdminI18n } from "./context";
  import type { ComponentProps } from "svelte";
  import LanguageSwitcher from "./LanguageSwitcher.svelte";
  import Internationalization from "../../routes/(manage)/manage/app/internationalization/+page.svelte";
  import Badges from "../../routes/(manage)/manage/app/badges/+page.svelte";
  import AlertLogs from "../../routes/(manage)/manage/app/alerts/logs/[alert_config_id]/+page.svelte";
  import Oidc from "../../routes/(manage)/manage/app/oidc/+page.svelte";
  import DangerZone from "../../routes/(manage)/manage/app/monitors/[tag]/components/DangerZoneCard.svelte";
  import ProviderSettingsPanel from "$lib/components/manage/ProviderSettingsPanel.svelte";
  import type { MonitorRecord } from "$lib/server/types/db";

  let { view }: { view: "internationalization" | "alert-logs" | "oidc" | "danger" | "provider" | "badges" } = $props();
  createAdminI18n("pl");
</script>

<LanguageSwitcher />
{#if view === "internationalization"}
  <Internationalization />
{:else if view === "badges"}
  <Badges />
{:else if view === "alert-logs"}
  <AlertLogs data={{ alert_config_id: "1" } as ComponentProps<typeof AlertLogs>["data"]} />
{:else if view === "oidc"}
  <Oidc />
{:else if view === "danger"}
  <DangerZone monitor={{ id: 1, tag: "Save", name: "Delete" } as MonitorRecord} status="ACTIVE" />
{:else}
  <ProviderSettingsPanel
    initialProviders={[
      { key: "test.provider", label: "Test Provider", isEnabled: false, activeInSite: false, requirements: [] }
    ]}
    description="Test settings"
  />
{/if}
