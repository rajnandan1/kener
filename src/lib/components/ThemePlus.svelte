<script lang="ts">
  import { Button } from "$lib/components/ui/button/index.js";
  import * as ButtonGroup from "$lib/components/ui/button-group/index.js";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
  import { setMode, mode } from "mode-watcher";
  import { page } from "$app/state";
  import { resolve } from "$app/paths";
  import { t } from "$lib/stores/i18n";

  import Sun from "@lucide/svelte/icons/sun";
  import Moon from "@lucide/svelte/icons/moon";
  import Share from "@lucide/svelte/icons/share-2";
  import Code from "@lucide/svelte/icons/code";
  import Sticker from "@lucide/svelte/icons/sticker";
  import Languages from "lucide-svelte/icons/languages";
  import Globe from "lucide-svelte/icons/globe";
  import ChevronDown from "@lucide/svelte/icons/chevron-down";
  import type { PageNavItem } from "$lib/server/controllers/dashboardController.js";
  import ChevronLeft from "@lucide/svelte/icons/chevron-left";
  import ICONS from "$lib/icons";
  import { format } from "date-fns";
  import SubscribeMenu from "$lib/components/SubscribeMenu.svelte";
  import CopyButton from "$lib/components/CopyButton.svelte";
  import BadgesMenu from "$lib/components/BadgesMenu.svelte";
  import EmbedMenu from "$lib/components/EmbedMenu.svelte";
  import { onMount } from "svelte";
  import LanguageSelector from "./LanguageSelector.svelte";

  interface Props {
    currentPath?: string;
    showPagesDropdown?: boolean;
    showEventsButton?: boolean;
    showHomeButton?: boolean;
    monitor_tags?: string[];
    shareLinkString?: string;
    embedMonitorTag?: string;
  }

  let openSubscribeMenu = $state(false);
  let openBadgesMenu = $state(false);
  let openEmbedMenu = $state(false);

  let {
    currentPath = "/",
    showPagesDropdown = false,
    showEventsButton = false,
    showHomeButton = false,
    shareLinkString = "",
    embedMonitorTag = ""
  }: Props = $props();

  let protocol = $state("");
  let domain = $state("");
  const pages = $derived<PageNavItem[]>(page.data.allPages || []);
  const currentPage = $derived(pages.find((p) => p.page_path === currentPath) || pages[0]);
  const eventsPath = $derived(`/events/${format(new Date(), "MMMM-yyyy")}`);
  const shareLink = $derived(
    protocol && domain && shareLinkString ? `${protocol}://${domain}${resolve(shareLinkString as `/${string}`)}` : ""
  );

  function toggleMode() {
    if (mode.current === "light") {
      setMode("dark");
    } else {
      setMode("light");
    }
  }

  onMount(() => {
    protocol = window.location.protocol;
    domain = window.location.host;
  });
</script>

<div class=" flex w-full items-center justify-between gap-2">
  <div class="flex items-center gap-2">
    {#if showPagesDropdown && pages.length > 0}
      <DropdownMenu.Root>
        <DropdownMenu.Trigger>
          {#snippet child({ props })}
            <Button {...props} variant="outline" size="sm" class="rounded-full text-xs shadow-none">
              {currentPage?.page_title || "Home"}
              <ChevronDown class="ml-1 h-4 w-4" />
            </Button>
          {/snippet}
        </DropdownMenu.Trigger>
        <DropdownMenu.Content align="start" class="flex flex-col gap-1 rounded-3xl p-2">
          {#each pages as page}
            <Button
              variant={page.page_path === currentPath ? "outline" : "ghost"}
              size="sm"
              href={page.page_path}
              class="w-full justify-start rounded-full text-xs shadow-none"
            >
              {page.page_title}
            </Button>
          {/each}
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    {/if}
    {#if showHomeButton}
      <Button href="/" variant="outline" size="sm" class="rounded-full text-xs shadow-none">
        <ChevronLeft class="h-4 w-4" />
        {$t("Home")}
      </Button>
    {/if}
    {#if showEventsButton}
      <Button href={eventsPath} variant="outline" size="sm" class="rounded-full text-xs shadow-none">
        <ICONS.Events class="h-4 w-4" />
        {$t("Events")}
      </Button>
    {/if}
  </div>
  <div class="flex gap-2">
    <ButtonGroup.Root class="">
      {#if page.data.isSubsEnabled}
        <ButtonGroup.Root class="hidden sm:flex">
          <Button
            variant="outline"
            size="sm"
            class="rounded-btn text-xs"
            aria-label="Go Back"
            onclick={() => (openSubscribeMenu = true)}
          >
            <ICONS.Bell class="" />
            {$t("Subscribe")}
          </Button>
        </ButtonGroup.Root>
      {/if}

      <ButtonGroup.Root>
        {#if !!page.data.subMenuOptions?.showCopyCurrentPageLink}
          <CopyButton variant="outline" text={shareLink} class="cursor-pointer rounded-full shadow-none" size="icon-sm">
            <Share />
          </CopyButton>
        {/if}
        {#if !!embedMonitorTag && page.data.subMenuOptions?.showShareBadgeMonitor}
          <!-- BadgeMenu -->
          <Button
            variant="outline"
            class="relative cursor-pointer rounded-full shadow-none"
            size="icon-sm"
            onclick={() => (openBadgesMenu = true)}
          >
            <Sticker />
          </Button>
        {/if}
        {#if !!embedMonitorTag && page.data.subMenuOptions?.showShareEmbedMonitor}
          <!-- Embed Menu -->
          <Button
            variant="outline"
            class="relative cursor-pointer rounded-full shadow-none"
            size="icon-sm"
            onclick={() => (openEmbedMenu = true)}
          >
            <Code />
          </Button>
        {/if}
      </ButtonGroup.Root>
      <ButtonGroup.Root class=" hidden  sm:flex">
        <Button
          variant="outline"
          size="sm"
          onclick={toggleMode}
          aria-label="toggle theme mode "
          class="relative rounded-full shadow-none"
        >
          <Sun class="absolute left-2  scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
          <Moon class="absolute left-2  scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
          <!-- Show light / dark text -->
          <span class="pl-5 text-xs">
            {mode.current === "light" ? "Light" : "Dark"}
          </span>
        </Button>
        <LanguageSelector />
        <Button variant="outline" size="icon-sm" onclick={toggleMode} aria-label="" class="rounded-full shadow-none">
          <Globe class="" />
        </Button>
      </ButtonGroup.Root>
    </ButtonGroup.Root>
  </div>
</div>

<SubscribeMenu bind:open={openSubscribeMenu} />
<BadgesMenu bind:open={openBadgesMenu} monitorTag={embedMonitorTag} {protocol} {domain} />
<EmbedMenu bind:open={openEmbedMenu} monitorTag={embedMonitorTag} {protocol} {domain} />
