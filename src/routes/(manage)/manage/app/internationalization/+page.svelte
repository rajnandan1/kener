<script lang="ts">
  import { Button } from "$lib/components/ui/button/index.js";
  import { Label } from "$lib/components/ui/label/index.js";
  import { Switch } from "$lib/components/ui/switch/index.js";
  import { Spinner } from "$lib/components/ui/spinner/index.js";
  import { Checkbox } from "$lib/components/ui/checkbox/index.js";
  import * as Card from "$lib/components/ui/card/index.js";
  import * as Select from "$lib/components/ui/select/index.js";
  import * as Breadcrumb from "$lib/components/ui/breadcrumb/index.js";
  import SaveIcon from "@lucide/svelte/icons/save";
  import Loader from "@lucide/svelte/icons/loader";
  import GlobeIcon from "@lucide/svelte/icons/globe";
  import ClockIcon from "@lucide/svelte/icons/clock";
  import { toast } from "svelte-sonner";
  import localesData from "$lib/locales/locales.json";
  import { resolve } from "$app/paths";
  import clientResolver from "$lib/client/resolver.js";

  interface Locale {
    code: string;
    name: string;
    selected: boolean;
    disabled: boolean;
  }

  interface I18nConfig {
    defaultLocale: string;
    locales: Locale[];
  }

  // State
  let loading = $state(true);
  let savingLanguages = $state(false);
  let savingTimezone = $state(false);
  let tzToggle = $state("NO");
  let i18n = $state<I18nConfig>({
    defaultLocale: "en",
    locales: localesData.map((el) => ({
      code: el.code,
      name: el.name,
      selected: el.code === "en",
      disabled: false
    }))
  });

  // Computed: available locales for default selection (only selected ones)
  const availableDefaultLocales = $derived(i18n.locales.filter((locale) => locale.selected));

  async function fetchSettings() {
    loading = true;
    try {
      const response = await fetch(clientResolver(resolve, "/manage/api"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "getAllSiteData" })
      });
      const result = await response.json();
      if (result.error) {
        toast.error(result.error);
      } else {
        if (result.tzToggle) {
          tzToggle = result.tzToggle;
        }
        if (result.i18n) {
          // Merge with all available locales
          const existingLocales = result.i18n.locales || [];
          i18n = {
            defaultLocale: result.i18n.defaultLocale || "en",
            locales: localesData.map((el) => {
              const existing = existingLocales.find((l: Locale) => l.code === el.code);
              return {
                code: el.code,
                name: el.name,
                selected: existing ? existing.selected : false,
                disabled: false
              };
            })
          };
        }
      }
    } catch (e) {
      toast.error("Failed to load settings");
    } finally {
      loading = false;
    }
  }

  async function saveLanguages() {
    savingLanguages = true;
    try {
      const response = await fetch(clientResolver(resolve, "/manage/api"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "storeSiteData",
          data: {
            i18n: JSON.stringify(i18n)
          }
        })
      });
      const result = await response.json();
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Language settings saved successfully");
      }
    } catch (e) {
      toast.error("Failed to save language settings");
    } finally {
      savingLanguages = false;
    }
  }

  async function saveTimezone() {
    savingTimezone = true;
    try {
      const response = await fetch(clientResolver(resolve, "/manage/api"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "storeSiteData",
          data: {
            tzToggle: tzToggle
          }
        })
      });
      const result = await response.json();
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Timezone settings saved successfully");
      }
    } catch (e) {
      toast.error("Failed to save timezone settings");
    } finally {
      savingTimezone = false;
    }
  }

  function toggleLocale(code: string, checked: boolean) {
    const locale = i18n.locales.find((l) => l.code === code);
    if (locale) {
      locale.selected = checked;
      // If this was the default locale and it's being unchecked, reset default
      if (!checked && i18n.defaultLocale === code) {
        const firstSelected = i18n.locales.find((l) => l.selected);
        if (firstSelected) {
          i18n.defaultLocale = firstSelected.code;
        }
      }
      i18n = { ...i18n };
    }
  }

  function setDefaultLocale(code: string) {
    i18n.defaultLocale = code;
  }

  $effect(() => {
    fetchSettings();
  });
</script>

<div class="flex w-full flex-col gap-4 p-4">
  <!-- Breadcrumb -->
  <Breadcrumb.Root>
    <Breadcrumb.List>
      <Breadcrumb.Item>
        <Breadcrumb.Link href={clientResolver(resolve, "/manage/app/monitors")}>Home</Breadcrumb.Link>
      </Breadcrumb.Item>
      <Breadcrumb.Separator />
      <Breadcrumb.Item>
        <Breadcrumb.Page>Internationalization</Breadcrumb.Page>
      </Breadcrumb.Item>
    </Breadcrumb.List>
  </Breadcrumb.Root>

  {#if loading}
    <div class="flex items-center justify-center py-12">
      <Spinner class="h-6 w-6" />
    </div>
  {:else}
    <!-- Languages Card -->
    <Card.Root>
      <Card.Header>
        <div class="flex items-center gap-2">
          <GlobeIcon class="h-5 w-5" />
          <div>
            <Card.Title>Languages</Card.Title>
            <Card.Description>Configure the available languages for your status page</Card.Description>
          </div>
        </div>
      </Card.Header>
      <Card.Content class="space-y-6">
        <!-- Available Languages -->
        <div class="space-y-3">
          <Label class="text-sm font-medium">Available Languages</Label>
          <p class="text-muted-foreground text-xs">
            Select the languages you want to make available on your status page. Users will be able to switch between
            these languages.
          </p>
          <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {#each i18n.locales as locale (locale.code)}
              <div class="flex items-center space-x-2">
                <Checkbox
                  id="locale-{locale.code}"
                  checked={locale.selected}
                  disabled={i18n.defaultLocale === locale.code}
                  onCheckedChange={(checked) => toggleLocale(locale.code, checked === true)}
                />
                <Label
                  for="locale-{locale.code}"
                  class="text-sm font-normal {i18n.defaultLocale === locale.code ? 'text-muted-foreground' : ''}"
                >
                  {locale.name}
                  {#if i18n.defaultLocale === locale.code}
                    <span class="text-muted-foreground text-xs">(default)</span>
                  {/if}
                </Label>
              </div>
            {/each}
          </div>
        </div>

        <!-- Default Language -->
        <div class="space-y-3">
          <Label class="text-sm font-medium">Default Language</Label>
          <p class="text-muted-foreground text-xs">
            The default language will be shown when users first visit your status page.
          </p>
          <Select.Root
            type="single"
            value={i18n.defaultLocale}
            onValueChange={(v) => {
              if (v) setDefaultLocale(v);
            }}
          >
            <Select.Trigger class="w-[200px]">
              {i18n.locales.find((l) => l.code === i18n.defaultLocale)?.name || "Select language"}
            </Select.Trigger>
            <Select.Content>
              {#each availableDefaultLocales as locale (locale.code)}
                <Select.Item value={locale.code}>{locale.name}</Select.Item>
              {/each}
            </Select.Content>
          </Select.Root>
        </div>
      </Card.Content>
      <Card.Footer class="flex justify-end">
        <Button onclick={saveLanguages} disabled={savingLanguages}>
          {#if savingLanguages}
            <Loader class="mr-2 h-4 w-4 animate-spin" />
          {:else}
            <SaveIcon class="mr-2 h-4 w-4" />
          {/if}
          Save Languages
        </Button>
      </Card.Footer>
    </Card.Root>

    <!-- Timezone Settings Card -->
    <Card.Root>
      <Card.Header>
        <div class="flex items-center gap-2">
          <ClockIcon class="h-5 w-5" />
          <div>
            <Card.Title>Timezone Settings</Card.Title>
            <Card.Description>Configure timezone switching for your status page</Card.Description>
          </div>
        </div>
      </Card.Header>
      <Card.Content class="space-y-4">
        <p class="text-muted-foreground text-sm">
          Kener automatically detects the user's timezone and displays times accordingly. You can optionally allow users
          to manually switch between different timezones.
        </p>
        <div class="flex items-center space-x-3">
          <Switch
            id="tz-toggle"
            checked={tzToggle === "YES"}
            onCheckedChange={(checked) => (tzToggle = checked ? "YES" : "NO")}
          />
          <Label for="tz-toggle" class="font-normal">Allow users to switch timezones</Label>
        </div>
      </Card.Content>
      <Card.Footer class="flex justify-end">
        <Button onclick={saveTimezone} disabled={savingTimezone}>
          {#if savingTimezone}
            <Loader class="mr-2 h-4 w-4 animate-spin" />
          {:else}
            <SaveIcon class="mr-2 h-4 w-4" />
          {/if}
          Save Timezone
        </Button>
      </Card.Footer>
    </Card.Root>
  {/if}
</div>
