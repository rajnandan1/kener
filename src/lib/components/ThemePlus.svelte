<script lang="ts">
  import { Button } from "$lib/components/ui/button/index.js";
  import * as ButtonGroup from "$lib/components/ui/button-group/index.js";
  import { page } from "$app/state";
  import { t } from "$lib/stores/i18n";
  import { resolve } from "$app/paths";
  import clientResolver from "$lib/client/resolver.js";

  import SubscribeMenu from "$lib/components/SubscribeMenu.svelte";
  import BadgesMenu from "$lib/components/BadgesMenu.svelte";
  import EmbedMenu from "$lib/components/EmbedMenu.svelte";
  import { onMount } from "svelte";
  import SiteBanner from "./SiteBanner.svelte";

  interface Props {
    monitor_tags?: string[];
    embedMonitorTag?: string;
  }

  let { monitor_tags = [], embedMonitorTag = "" }: Props = $props();

  let protocol = $state("");
  let domain = $state("");

  const loginDetails = $derived.by((): { label: string; url: string } | null => {
    if (!page.data?.loggedInUser) return null;

    if (page.route.id === "/(kener)/monitors/[monitor_tag]") {
      return {
        label: $t("Edit Monitor"),
        url: clientResolver(resolve, "/manage/app/monitors/" + page.params.monitor_tag)
      };
    } else if (page.route.id === "/(kener)/incidents/[incident_id]") {
      return {
        label: $t("Update Incident"),
        url: clientResolver(resolve, "/manage/app/incidents/" + page.params.incident_id)
      };
    } else if (page.route.id === "/(kener)/maintenances/[maintenance_id]") {
      return {
        label: $t("Update Maintenance"),
        url: clientResolver(resolve, "/manage/app/maintenances/" + page.data.maintenance.id)
      };
    } else {
      return {
        label: $t("Manage Site"),
        url: clientResolver(resolve, "/manage/app/site-configurations")
      };
    }
  });

  onMount(() => {
    protocol = window.location.protocol;
    domain = window.location.host;
  });
</script>

<div class="theme-plus-bar scrollbar-hidden sticky top-18 z-20 flex w-full items-center gap-2 rounded py-2">
  <div class="ml-auto flex shrink-0 items-center gap-2">
    {#if page.data.isSubsEnabled && page.data.canSendEmail}
      <ButtonGroup.Root class="hidden shrink-0 sm:flex">
        <SubscribeMenu />
      </ButtonGroup.Root>
    {/if}

    {#if page.data.isSubsEnabled && page.data.canSendEmail}
      <ButtonGroup.Root class="rounded-btn-grp shrink-0 sm:hidden">
        <SubscribeMenu compact={true} />
      </ButtonGroup.Root>
    {/if}

    <ButtonGroup.Root class="rounded-btn-grp shrink-0">
      <BadgesMenu {protocol} {domain} />
      <EmbedMenu {protocol} {domain} />
    </ButtonGroup.Root>

    {#if loginDetails}
      <Button
        size="sm"
        href={loginDetails.url}
        target="_blank"
        class="bg-accent-foreground text-accent border-foreground/10 rounded-full border  text-xs font-semibold shadow-none  "
      >
        {loginDetails.label}
      </Button>
    {/if}
  </div>
</div>

{#if !!page.data.announcement && !!page.data.announcement.title && !!page.data.announcement.message}
  <SiteBanner announcement={page.data.announcement} />
{/if}
