<script lang="ts">
  import { page } from "$app/state";
  import * as NavigationMenu from "$lib/components/ui/navigation-menu/index.js";
  import * as Dropdown from "$lib/components/ui/dropdown-menu/index.js";
  import * as ButtonGroup from "$lib/components/ui/button-group/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import { navigationMenuTriggerStyle } from "$lib/components/ui/navigation-menu/navigation-menu-trigger.svelte";
  import { resolve } from "$app/paths";
  import clientResolver from "$lib/client/resolver.js";
  import trackEvent from "$lib/beacon";
  import MenuIcon from "@lucide/svelte/icons/menu";
  import Sun from "@lucide/svelte/icons/sun";
  import Moon from "@lucide/svelte/icons/moon";
  import { setMode, mode } from "mode-watcher";
  import { i18n, t } from "$lib/stores/i18n";
  import LanguageSelector from "./LanguageSelector.svelte";
  import TimezoneSelector from "./TimezoneSelector.svelte";
  import PageSelector from "./PageSelector.svelte";
  import NotificationsPopover from "./NotificationsPopover.svelte";
  import SubscribeMenu from "./SubscribeMenu.svelte";
  import BadgesMenu from "./BadgesMenu.svelte";
  import EmbedMenu from "./EmbedMenu.svelte";
  import { format } from "date-fns";
  import { onMount } from "svelte";

  let { data } = page;
  const navItems: { name: string; url: string; iconURL: string }[] = data.navItems || [];
  const { siteName, logo, globalPageVisibilitySettings } = data;

  const brandPath = $derived.by(() => {
    if (globalPageVisibilitySettings?.forceExclusivity) {
      const currentPagePath = page.params?.page_path?.trim();
      return currentPagePath ? `/${currentPagePath}` : "/";
    }
    return "/";
  });

  function trackBrandClick() {
    trackEvent("nav_brand_clicked", { name: siteName });
  }

  function trackNavClick(item: { name: string; url: string }) {
    trackEvent("nav_link_clicked", { name: item.name, external: item.url.startsWith("http") });
  }

  function toggleMode() {
    if (mode.current === "light") {
      setMode("dark");
    } else {
      setMode("light");
    }
    trackEvent("theme_toggled", { mode: mode.current });
  }

  const eventsPath = $derived(`/events/${format(new Date(), "MMMM-yyyy")}`);
  const showPageSelector = $derived(
    !page.data?.globalPageVisibilitySettings?.forceExclusivity &&
      !!page.data?.globalPageVisibilitySettings?.showSwitcher
  );

  let protocol = $state("");
  let domain = $state("");
  onMount(() => {
    protocol = window.location.protocol;
    domain = window.location.host;
  });

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
</script>

<div class="fixed inset-x-0 top-0 z-10 py-2">
  <div class="mx-auto max-w-5xl px-4">
    <div
      class="bg-background/80 dark:bg-background/70 flex items-center justify-between rounded-3xl border p-1 backdrop-blur-md"
    >
      <!-- Brand -->
      <a
        href={clientResolver(resolve, brandPath)}
        class="{navigationMenuTriggerStyle()} hover:border-border border border-transparent bg-transparent text-xs hover:bg-transparent"
        style="border-radius: var(--radius-3xl)"
        onclick={trackBrandClick}
      >
        {#if logo}
          <img src={clientResolver(resolve, logo)} alt={siteName} class="mr-2 h-6 w-6 rounded-full object-cover" />
        {/if}
        {siteName}
      </a>

      <!-- Desktop Nav Links -->
      <NavigationMenu.Root class="hidden sm:block">
        <NavigationMenu.List>
          {#each navItems as item (item.url)}
            <NavigationMenu.Item>
              <NavigationMenu.Link>
                {#snippet child()}
                  <a
                    data-sveltekit-preload-data="off"
                    href={clientResolver(resolve, item.url)}
                    class="{navigationMenuTriggerStyle()} hover:border-border border border-transparent bg-transparent text-xs hover:bg-transparent"
                    target={item.url.startsWith("http") ? "_blank" : undefined}
                    rel={item.url.startsWith("http") ? "noopener noreferrer" : undefined}
                    style="border-radius: var(--radius-3xl)"
                    onclick={() => trackNavClick(item)}
                  >
                    {#if item.iconURL}
                      <img
                        src={clientResolver(resolve, item.iconURL)}
                        alt={item.name}
                        class="mr-2 h-4 w-4 object-cover"
                      />
                    {/if}
                    {item.name}
                  </a>
                {/snippet}
              </NavigationMenu.Link>
            </NavigationMenu.Item>
          {/each}
        </NavigationMenu.List>
      </NavigationMenu.Root>

      <!-- Page selector (board switcher) -->
      {#if showPageSelector}
        <div class="ml-auto mr-1 shrink-0">
          <PageSelector />
        </div>
      {/if}

      <!-- Desktop UI preference controls: theme / language / timezone -->
      <ButtonGroup.Root
        class={[
          "rounded-btn-grp mr-1 hidden shrink-0 sm:flex",
          !showPageSelector && "ml-auto"
        ]}
      >        {#if page.data?.isThemeToggleEnabled}
          <Button
            variant="outline"
            size="icon-sm"
            onclick={toggleMode}
            aria-label="toggle theme mode"
            class="bg-background/80 dark:bg-background/70 border-foreground/10 relative rounded-full border shadow-none backdrop-blur-md"
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
        {#if page.data?.isTimezoneEnabled}
          <TimezoneSelector compact={true} />
        {/if}
      </ButtonGroup.Root>

      <!-- Mobile UI preference controls -->
      <ButtonGroup.Root
        class={[
          "rounded-btn-grp mr-1 flex shrink-0 sm:hidden",
          !showPageSelector && "ml-auto"
        ]}
      >
        {#if page.data?.isThemeToggleEnabled}
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
        {#if page.data?.isTimezoneEnabled}
          <TimezoneSelector compact={true} />
        {/if}
      </ButtonGroup.Root>

      <!-- Notifications / alerts -->
      <div class="mr-1 shrink-0">
        <NotificationsPopover {eventsPath} compact={true} />
      </div>

      <!-- Subscribe -->
      {#if page.data.isSubsEnabled && page.data.canSendEmail}
        <ButtonGroup.Root class="rounded-btn-grp mr-1 shrink-0">
          <SubscribeMenu compact={true} />
        </ButtonGroup.Root>
      {/if}

      <!-- Badges + Embed -->
      <ButtonGroup.Root class="rounded-btn-grp mr-1 hidden shrink-0 sm:flex">
        <BadgesMenu {protocol} {domain} />
        <EmbedMenu {protocol} {domain} />
      </ButtonGroup.Root>

      <!-- Manage / Edit shortcut -->
      {#if loginDetails}
        <Button
          size="sm"
          href={loginDetails.url}
          target="_blank"
          class="bg-accent-foreground text-accent border-foreground/10 mr-1 rounded-full border text-xs font-semibold shadow-none"
        >
          {loginDetails.label}
        </Button>
      {/if}

      <!-- Mobile Nav -->
      {#if navItems.length > 0}
        <Dropdown.Root>
          <Dropdown.Trigger>
            {#snippet child({ props })}
              <button
                {...props}
                type="button"
                class="{navigationMenuTriggerStyle()} hover:border-border border border-transparent bg-transparent text-xs hover:bg-transparent sm:hidden"
                style="border-radius: var(--radius-3xl)"
                aria-label="Open navigation menu"
              >
                <MenuIcon class="h-4 w-4" />
              </button>
            {/snippet}
          </Dropdown.Trigger>
          <Dropdown.Content align="end" class="w-56 rounded-3xl p-2">
            {#each navItems as item (item.url)}
              <Button
                variant="ghost"
                size="sm"
                href={clientResolver(resolve, item.url)}
                class="w-full justify-start rounded-full text-xs"
                target={item.url.startsWith("http") ? "_blank" : undefined}
                rel={item.url.startsWith("http") ? "noopener noreferrer" : undefined}
                onclick={() => trackNavClick(item)}
              >
                {#if item.iconURL}
                  <img src={clientResolver(resolve, item.iconURL)} alt={item.name} class="mr-2 h-4 w-4 object-cover" />
                {/if}
                {item.name}
              </Button>
            {/each}
          </Dropdown.Content>
        </Dropdown.Root>
      {/if}
    </div>
  </div>
</div>
