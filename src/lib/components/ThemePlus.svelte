<script lang="ts">
  import { Button } from "$lib/components/ui/button/index.js";
  import * as ButtonGroup from "$lib/components/ui/button-group/index.js";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
  import { setMode, mode } from "mode-watcher";
  import { page } from "$app/state";
  import { i18n, t } from "$lib/stores/i18n";
  import { resolve } from "$app/paths";
  import clientResolver from "$lib/client/resolver.js";
  import { Spinner } from "$lib/components/ui/spinner/index.js";

  import Sun from "@lucide/svelte/icons/sun";
  import Moon from "@lucide/svelte/icons/moon";
  import Share from "@lucide/svelte/icons/share-2";
  import ChevronDown from "@lucide/svelte/icons/chevron-down";
  import type { PageNavItem } from "$lib/server/controllers/dashboardController.js";
  import ChevronLeft from "@lucide/svelte/icons/chevron-left";
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

  interface Props {
    currentPath?: string;
    monitor_tags?: string[];
    embedMonitorTag?: string;
  }

  let { currentPath = "/", monitor_tags = [], embedMonitorTag = "" }: Props = $props();

  let protocol = $state("");
  let domain = $state("");
  let shareLink = $state("");
  let pages = $state<PageNavItem[]>([]);
  let pagesLoading = $state(false);
  const currentPage = $derived(pages.find((p) => p.page_path === currentPath) || pages[0]);
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

  async function fetchPages() {
    pagesLoading = true;
    try {
      const response = await fetch(clientResolver(resolve, "/dashboard-apis/pages"));
      if (response.ok) {
        pages = await response.json();
      }
    } catch {
      // silently fail, pages dropdown will just not show
    } finally {
      pagesLoading = false;
    }
  }

  onMount(() => {
    protocol = window.location.protocol;
    domain = window.location.host;
    shareLink = window.location.href;
    fetchPages();
  });
</script>

<div class="theme-plus-bar sticky top-18 z-20 flex w-full items-center gap-2 overflow-x-auto rounded py-2">
  <div class="flex shrink-0 items-center gap-2">
    {#if pagesLoading}
      <Button
        variant="outline"
        size="sm"
        class="bg-background/80 dark:bg-background/70 border-foreground/10 flex items-center justify-center rounded-full border text-xs shadow-none backdrop-blur-md"
        disabled
      >
        <Spinner class="h-4 w-4" />
      </Button>
    {:else if pages.length > 1}
      <DropdownMenu.Root>
        <DropdownMenu.Trigger>
          {#snippet child({ props })}
            <Button
              {...props}
              variant="outline"
              size="sm"
              class="bg-background/80 dark:bg-background/70   border-foreground/10 flex items-center justify-center rounded-full border text-xs shadow-none backdrop-blur-md"
            >
              <span class="hidden max-w-[16rem] truncate sm:inline">{currentPage?.page_title || "Home"}</span>
              <span class="sr-only sm:hidden">{currentPage?.page_title || "Home"}</span>
              <ChevronDown class="h-4 w-4" />
            </Button>
          {/snippet}
        </DropdownMenu.Trigger>
        <DropdownMenu.Content
          align="start"
          class="bg-background/30 supports-backdrop-filter:bg-background/20 flex  flex-col gap-1 rounded-3xl border   p-2    shadow-2xl backdrop-blur-2xl"
        >
          {#each pages as page (page.page_path)}
            <Button
              variant={page.page_path === currentPath ? "outline" : "ghost"}
              size="sm"
              href={`/${page.page_path}`}
              class="w-full justify-start rounded-full text-xs shadow-none"
            >
              {page.page_title}
            </Button>
          {/each}
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    {/if}
  </div>
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
