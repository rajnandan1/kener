<script lang="ts">
  import { Button } from "$lib/components/ui/button/index.js";
  import { Label } from "$lib/components/ui/label/index.js";
  import { Switch } from "$lib/components/ui/switch/index.js";
  import { Spinner } from "$lib/components/ui/spinner/index.js";
  import { Checkbox } from "$lib/components/ui/checkbox/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import * as Card from "$lib/components/ui/card/index.js";
  import * as Select from "$lib/components/ui/select/index.js";
  import * as Breadcrumb from "$lib/components/ui/breadcrumb/index.js";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import SaveIcon from "@lucide/svelte/icons/save";
  import Loader from "@lucide/svelte/icons/loader";
  import GlobeIcon from "@lucide/svelte/icons/globe";
  import ClockIcon from "@lucide/svelte/icons/clock";
  import CalendarClockIcon from "@lucide/svelte/icons/calendar-clock";
  import { toast } from "svelte-sonner";
  import { availableLocalesList } from "$lib/stores/i18n";
  import { resolve } from "$app/paths";
  import clientResolver from "$lib/client/resolver.js";
  import { format } from "date-fns";

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
  let savingDateTimeFormat = $state(false);
  let tzToggle = $state("NO");
  let dateAndTimeFormat = $state({
    datePlusTime: "PPpp",
    dateOnly: "PP",
    timeOnly: "pp"
  });
  let i18n = $state<I18nConfig>({
    defaultLocale: "en",
    locales: availableLocalesList.map((el) => ({
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
        if (result.dateAndTimeFormat) {
          dateAndTimeFormat = {
            datePlusTime: result.dateAndTimeFormat.datePlusTime || "PPpp",
            dateOnly: result.dateAndTimeFormat.dateOnly || "PP",
            timeOnly: result.dateAndTimeFormat.timeOnly || "pp"
          };
        }
        if (result.i18n) {
          // Merge with all available locales
          const existingLocales = result.i18n.locales || [];
          i18n = {
            defaultLocale: result.i18n.defaultLocale || "en",
            locales: availableLocalesList.map((el) => {
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

  const previewDate = new Date();

  const datePlusTimeSuggestions = [
    { value: "PPp", label: "Locale (AM/PM)" },
    { value: "PP HH:mm", label: "Locale date + 24h" },
    { value: "yyyy-MM-dd HH:mm", label: "ISO-like 24h" }
  ];

  const dateOnlySuggestions = [
    { value: "PP", label: "Locale" },
    { value: "yyyy-MM-dd", label: "ISO" },
    { value: "dd/MM/yyyy", label: "Day-first" }
  ];

  const timeOnlySuggestions = [
    { value: "p", label: "Locale (AM/PM)" },
    { value: "HH:mm", label: "24h" },
    { value: "HH:mm", label: "24h short" }
  ];

  function formatPreview(fmt: string): string {
    try {
      return format(previewDate, fmt);
    } catch {
      return "Invalid format";
    }
  }

  async function saveDateTimeFormat() {
    savingDateTimeFormat = true;
    try {
      const response = await fetch(clientResolver(resolve, "/manage/api"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "storeSiteData",
          data: {
            dateAndTimeFormat: JSON.stringify(dateAndTimeFormat)
          }
        })
      });
      const result = await response.json();
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Date & time format saved successfully");
      }
    } catch (e) {
      toast.error("Failed to save date & time format");
    } finally {
      savingDateTimeFormat = false;
    }
  }

  $effect(() => {
    fetchSettings();
  });
</script>

<div class="flex w-full flex-col gap-4 p-4">
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
            <Loader class="h-4 w-4 animate-spin" />
          {:else}
            <SaveIcon class="h-4 w-4" />
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
            <Loader class="h-4 w-4 animate-spin" />
          {:else}
            <SaveIcon class="h-4 w-4" />
          {/if}
          Save Timezone
        </Button>
      </Card.Footer>
    </Card.Root>

    <!-- Date & Time Format Card -->
    <Card.Root>
      <Card.Header>
        <div class="flex items-center gap-2">
          <CalendarClockIcon class="h-5 w-5" />
          <div>
            <Card.Title>Date & Time Format</Card.Title>
            <Card.Description>
              Choose how dates and times are displayed across your status page. Uses
              <a
                href="https://date-fns.org/docs/format"
                target="_blank"
                class="hover:text-foreground underline underline-offset-2">date-fns format tokens</a
              >.
            </Card.Description>
          </div>
        </div>
      </Card.Header>
      <Card.Content class="space-y-6">
        <!-- Date + Time -->
        <div class="space-y-2">
          <Label class="text-sm font-medium">Date + Time</Label>
          <Input
            class="font-mono text-sm"
            placeholder="e.g. PPpp"
            value={dateAndTimeFormat.datePlusTime}
            oninput={(e) => {
              dateAndTimeFormat.datePlusTime = e.currentTarget.value;
            }}
          />
          <div class="flex flex-wrap items-center gap-1.5">
            {#each datePlusTimeSuggestions as s (s.value)}
              <Badge
                variant={dateAndTimeFormat.datePlusTime === s.value ? "default" : "outline"}
                class="cursor-pointer"
                href={undefined}
                onclick={() => {
                  dateAndTimeFormat.datePlusTime = s.value;
                }}
              >
                {s.label} ({s.value})
              </Badge>
            {/each}
          </div>
          <p class="text-muted-foreground text-xs">
            Preview: <code>{formatPreview(dateAndTimeFormat.datePlusTime)}</code>
          </p>
        </div>

        <!-- Date Only -->
        <div class="space-y-2">
          <Label class="text-sm font-medium">Date Only</Label>
          <Input
            class="font-mono text-sm"
            placeholder="e.g. PP"
            value={dateAndTimeFormat.dateOnly}
            oninput={(e) => {
              dateAndTimeFormat.dateOnly = e.currentTarget.value;
            }}
          />
          <div class="flex flex-wrap items-center gap-1.5">
            {#each dateOnlySuggestions as s (s.value)}
              <Badge
                variant={dateAndTimeFormat.dateOnly === s.value ? "default" : "outline"}
                class="cursor-pointer"
                href={undefined}
                onclick={() => {
                  dateAndTimeFormat.dateOnly = s.value;
                }}
              >
                {s.label} ({s.value})
              </Badge>
            {/each}
          </div>
          <p class="text-muted-foreground text-xs">Preview: <code>{formatPreview(dateAndTimeFormat.dateOnly)}</code></p>
        </div>

        <!-- Time Only -->
        <div class="space-y-2">
          <Label class="text-sm font-medium">Time Only</Label>
          <Input
            class="font-mono text-sm"
            placeholder="e.g. pp"
            value={dateAndTimeFormat.timeOnly}
            oninput={(e) => {
              dateAndTimeFormat.timeOnly = e.currentTarget.value;
            }}
          />
          <div class="flex flex-wrap items-center gap-1.5">
            {#each timeOnlySuggestions as s (s.value)}
              <Badge
                variant={dateAndTimeFormat.timeOnly === s.value ? "default" : "outline"}
                class="cursor-pointer"
                href={undefined}
                onclick={() => {
                  dateAndTimeFormat.timeOnly = s.value;
                }}
              >
                {s.label} ({s.value})
              </Badge>
            {/each}
          </div>
          <p class="text-muted-foreground text-xs">Preview: <code>{formatPreview(dateAndTimeFormat.timeOnly)}</code></p>
        </div>
      </Card.Content>
      <Card.Footer class="flex justify-end">
        <Button onclick={saveDateTimeFormat} disabled={savingDateTimeFormat}>
          {#if savingDateTimeFormat}
            <Loader class="h-4 w-4 animate-spin" />
          {:else}
            <SaveIcon class="h-4 w-4" />
          {/if}
          Save Format
        </Button>
      </Card.Footer>
    </Card.Root>
  {/if}
</div>
