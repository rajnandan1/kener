<script lang="ts">
  import { Button } from "$lib/components/ui/button/index.js";
  import * as ButtonGroup from "$lib/components/ui/button-group/index.js";
  import { setMode, mode } from "mode-watcher";
  import { page } from "$app/state";
  import { i18n, t } from "$lib/stores/i18n";
  import { resolve } from "$app/paths";
  import clientResolver from "$lib/client/resolver.js";

  import Sun from "@lucide/svelte/icons/sun";
  import Moon from "@lucide/svelte/icons/moon";
  import Share from "@lucide/svelte/icons/share-2";
  import { format } from "date-fns";
  import SubscribeMenu from "$lib/components/SubscribeMenu.svelte";
  import CopyButton from "$lib/components/CopyButton.svelte";
  import BadgesMenu from "$lib/components/BadgesMenu.svelte";
  import EmbedMenu from "$lib/components/EmbedMenu.svelte";
  import { onMount } from "svelte";
  import LanguageSelector from "./LanguageSelector.svelte";
  import TimezoneSelector from "./TimezoneSelector.svelte";
  import trackEvent from "$lib/beacon";
  import SiteBanner from "./SiteBanner.svelte";
  import NotificationsPopover from "./NotificationsPopover.svelte";
  import PageSelector from "./PageSelector.svelte";

  interface Props {
    monitor_tags?: string[];
    embedMonitorTag?: string;
  }

  let { monitor_tags = [], embedMonitorTag = "" }: Props = $props();

  let protocol = $state("");
  let domain = $state("");
  let shareLink = $state("");
  const eventsPath = $derived(`/events/${format(new Date(), "MMMM-yyyy")}`);

  const loginDetails = $derived.by((): { label: string; url: string } | null => {
    if (!page.data?.loggedInUser) return null;

    if (page.route.id === "/(kener)/monitors/[monitor_tag]") {
      return {
        label: "Edit Monitor",
        url: clientResolver(resolve, "/manage/app/monitors/" + page.params.monitor_tag)
      };
    } else if (page.route.id === "/(kener)/incidents/[incident_id]") {
      return {
        label: "Update Incident",
        url: clientResolver(resolve, "/manage/app/incidents/" + page.params.incident_id)
      };
    } else if (page.route.id === "/(kener)/maintenances/[maintenance_id]") {
      return {
        label: "Update Maintenance",
        url: clientResolver(resolve, "/manage/app/maintenances/" + page.data.maintenance.id)
      };
    } else {
      return {
        label: "Manage Site",
        url: clientResolver(resolve, "/manage/app/site-configurations")
      };
    }
  });

  function toggleMode() {
    if (mode.current === "light") {
      setMode("dark");
    } else {
      setMode("light");
    }
    trackEvent("theme_toggled", { mode: mode.current });
  }

  onMount(() => {
    protocol = window.location.protocol;
    domain = window.location.host;
    shareLink = window.location.href;
  });
</script>

<div class="theme-plus-bar scrollbar-hidden sticky top-18 z-20 flex w-full items-center gap-2 rounded py-2">
  {#if !!!page.data.globalPageVisibilitySettings.forceExclusivity && page.data.globalPageVisibilitySettings.showSwitcher}
    <PageSelector />
  {/if}
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
      <CopyButton
        variant="outline"
        text={shareLink}
        class="bg-background/80 dark:bg-background/70 border-foreground/10 cursor-pointer rounded-full border shadow-none backdrop-blur-md"
        size="icon-sm"
        onclick={() => trackEvent("share_link_copied", { source: "theme_plus" })}
      >
        <Share />
      </CopyButton>
      <BadgesMenu {protocol} {domain} />
      <EmbedMenu {protocol} {domain} />
    </ButtonGroup.Root>

    <ButtonGroup.Root class="rounded-btn-grp shrink-0 sm:hidden">
      {#if page.data.isThemeToggleEnabled}
        <Button
          variant="outline"
          size="icon-sm"
          onclick={toggleMode}
          aria-label="toggle theme mode"
          class="bg-background/80 dark:bg-background/70 border-foreground/10 rounded-full border shadow-none backdrop-blur-md"
        >
          {#if mode.current === "light"}
            <Sun class="h-4 w-4" />
          {:else}
            <Moon class="h-4 w-4" />
          {/if}
        </Button>
      {/if}
      {#if $i18n.availableLocales.length > 1}
        <LanguageSelector compact={true} />
      {/if}
      {#if page.data.isTimezoneEnabled}
        <TimezoneSelector compact={true} />
      {/if}
    </ButtonGroup.Root>

    <ButtonGroup.Root class="rounded-btn-grp hidden shrink-0 sm:flex">
      {#if page.data.isThemeToggleEnabled}
        <Button
          variant="outline"
          size="sm"
          onclick={toggleMode}
          aria-label="toggle theme mode "
          class="bg-background/80 dark:bg-background/70 border-foreground/10 relative rounded-full border shadow-none backdrop-blur-md"
        >
          <Sun class="absolute left-2  scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
          <Moon class="absolute left-2  scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
          <!-- Show light / dark text -->
          <span class="pl-5 text-xs">
            {mode.current === "light" ? $t("Light") : $t("Dark")}
          </span>
        </Button>
      {/if}
      {#if $i18n.availableLocales.length > 1}
        <LanguageSelector />
      {/if}
      {#if page.data.isTimezoneEnabled}
        <TimezoneSelector />
      {/if}
    </ButtonGroup.Root>
    <NotificationsPopover {eventsPath} monitorTags={monitor_tags} compact={true} />
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
