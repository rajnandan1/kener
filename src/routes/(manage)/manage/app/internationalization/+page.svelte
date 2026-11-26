<script lang="ts">
  import { Button } from "$lib/components/ui/button/index.js";
  import { Label } from "$lib/components/ui/label/index.js";
  import { Switch } from "$lib/components/ui/switch/index.js";
  import { Spinner } from "$lib/components/ui/spinner/index.js";
  import { Checkbox } from "$lib/components/ui/checkbox/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import * as Card from "$lib/components/ui/card/index.js";
  import * as Select from "$lib/components/ui/select/index.js";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import SaveIcon from "@lucide/svelte/icons/save";
  import Loader from "@lucide/svelte/icons/loader";
  import GlobeIcon from "@lucide/svelte/icons/globe";
  import ClockIcon from "@lucide/svelte/icons/clock";
  import CalendarClockIcon from "@lucide/svelte/icons/calendar-clock";
  import LanguagesIcon from "@lucide/svelte/icons/languages";
  import PlusIcon from "@lucide/svelte/icons/plus";
  import TrashIcon from "@lucide/svelte/icons/trash-2";
  import ListPlusIcon from "@lucide/svelte/icons/list-plus";
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
    contentTranslations?: Record<string, Record<string, string>>;
  }

  // State
  let loading = $state(true);
  let savingLanguages = $state(false);
  let savingTimezone = $state(false);
  let savingDateTimeFormat = $state(false);
  let savingContent = $state(false);
  let importingTexts = $state(false);
  // One row per text typed by the site owner; translations keyed by locale code
  let contentRows = $state<{ source: string; translations: Record<string, string> }[]>([]);
  // Language settings as last loaded or saved, so saving translations never publishes unsaved language edits
  let savedLanguages = $state<{ defaultLocale: string; locales: Locale[] }>({ defaultLocale: "en", locales: [] });
  let newSourceText = $state("");
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
  // Texts are typed in the default language, so they are translated into the other selected ones
  const translationLocales = $derived(
    i18n.locales.filter((locale) => locale.selected && locale.code !== i18n.defaultLocale)
  );

  function rowsFromContentTranslations(contentTranslations: Record<string, Record<string, string>> | undefined) {
    // A Map, because any text is a valid key, "constructor" and "__proto__" included
    const rows = new Map<string, Record<string, string>>();
    for (const [code, mappings] of Object.entries(contentTranslations || {})) {
      for (const [source, translated] of Object.entries(mappings || {})) {
        if (!rows.has(source)) rows.set(source, {});
        rows.get(source)![code] = translated;
      }
    }
    return Array.from(rows, ([source, translations]) => ({ source, translations }));
  }

  function contentTranslationsFromRows() {
    const byLocale = new Map<string, Array<[string, string]>>();
    for (const row of contentRows) {
      const source = row.source.trim();
      if (!source) continue;
      for (const [code, translated] of Object.entries(row.translations)) {
        if (!translated || !translated.trim()) continue;
        if (!byLocale.has(code)) byLocale.set(code, []);
        byLocale.get(code)!.push([source, translated.trim()]);
      }
    }
    // Object.fromEntries defines own properties, so a "__proto__" text stays an ordinary key
    return Object.fromEntries(Array.from(byLocale, ([code, entries]) => [code, Object.fromEntries(entries)]));
  }

  function addSourceText(text: string) {
    const source = text.trim();
    if (!source || contentRows.some((row) => row.source.trim() === source)) return false;
    contentRows.push({ source, translations: {} });
    return true;
  }

  function addNewSourceText() {
    if (addSourceText(newSourceText)) newSourceText = "";
  }

  function removeSourceText(index: number) {
    contentRows.splice(index, 1);
  }

  async function postManageApi(action: string, data: Record<string, unknown> = {}) {
    const response = await fetch(clientResolver(resolve, "/manage/api"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, data })
    });
    return response.json();
  }

  function pageMetaTexts(pageSettingsJson: string | null | undefined): string[] {
    try {
      const settings = JSON.parse(pageSettingsJson || "{}");
      return [settings?.metaPageTitle, settings?.metaPageDescription];
    } catch {
      return [];
    }
  }

  // Adds a row for every text the public pages translate: site name and meta tags, nav labels,
  // page titles, headers and meta tags, monitor names and descriptions, the footer and the banner
  async function importSiteTexts() {
    importingTexts = true;
    try {
      const [monitors, pages, siteData] = await Promise.all([
        postManageApi("getMonitors"),
        postManageApi("getPages"),
        postManageApi("getAllSiteData")
      ]);
      if (monitors.error || pages.error || siteData.error) {
        toast.error(monitors.error || pages.error || siteData.error);
        return;
      }
      const texts: string[] = [];
      texts.push(siteData.siteName, siteData.metaSiteTitle, siteData.metaSiteDescription);
      for (const item of siteData.nav || []) texts.push(item.name);
      for (const page of pages || []) {
        texts.push(page.page_title, page.page_header, page.page_subheader, ...pageMetaTexts(page.page_settings_json));
      }
      for (const monitor of monitors || []) texts.push(monitor.name, monitor.description);
      texts.push(siteData.footerHTML, siteData.announcement?.title, siteData.announcement?.message);
      const added = texts.filter((text) => typeof text === "string" && addSourceText(text)).length;
      toast.success(added ? `${added} texts added` : "No new texts to add");
    } catch (e) {
      toast.error("Failed to load the site texts");
    } finally {
      importingTexts = false;
    }
  }

  async function saveContentTranslations() {
    savingContent = true;
    try {
      const result = await postManageApi("storeSiteData", {
        i18n: JSON.stringify({ ...savedLanguages, contentTranslations: contentTranslationsFromRows() })
      });
      if (result.error) {
        toast.error(result.error);
      } else {
        i18n.contentTranslations = contentTranslationsFromRows();
        toast.success("Translations saved successfully");
      }
    } catch (e) {
      toast.error("Failed to save translations");
    } finally {
      savingContent = false;
    }
  }

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
          contentRows = rowsFromContentTranslations(result.i18n.contentTranslations);
          savedLanguages = {
            defaultLocale: result.i18n.defaultLocale || "en",
            locales: (result.i18n.locales || []).map((l: Locale) => ({ ...l }))
          };
          i18n = {
            contentTranslations: result.i18n.contentTranslations || {},
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
        savedLanguages = {
          defaultLocale: i18n.defaultLocale,
          locales: i18n.locales.map((l) => ({ ...l }))
        };
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
    { value: "yyyy-MM-dd HH:mm", label: "ISO-like 24h" },
    { value: "dd MMM yyyy h:mm a", label: "Day month year AM/PM" },
    { value: "MMM dd, yyyy HH:mm", label: "Month day year 24h" }
  ];

  const dateOnlySuggestions = [
    { value: "PP", label: "Locale" },
    { value: "yyyy-MM-dd", label: "ISO" },
    { value: "dd/MM/yyyy", label: "Day-first" },
    { value: "MMM dd, yyyy", label: "Month day year" },
    { value: "dd MMM yyyy", label: "Day month year" }
  ];

  const timeOnlySuggestions = [
    { value: "p", label: "Locale (AM/PM)" },
    { value: "HH:mm", label: "24h" },
    { value: "H:mm", label: "24h short" },
    { value: "h:mm a", label: "12h AM/PM" },
    { value: "hh:mm", label: "12h no period" }
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

    <!-- Content Translations Card -->
    <Card.Root>
      <Card.Header>
        <div class="flex items-center gap-2">
          <LanguagesIcon class="h-5 w-5" />
          <div>
            <Card.Title>Content Translations</Card.Title>
            <Card.Description>
              Translate the text you typed in yourself: monitor names and descriptions, page titles and headers, the
              site name, navigation labels, the footer and the announcement banner.
            </Card.Description>
          </div>
        </div>
      </Card.Header>
      <Card.Content class="space-y-4">
        {#if translationLocales.length === 0}
          <p class="text-muted-foreground text-sm">
            Select at least one language besides the default language to translate your content.
          </p>
        {:else}
          <p class="text-muted-foreground text-xs">
            Write each text exactly as it appears in the default language. A text with no translation is shown as typed.
            If you rename a monitor or a page, add its new name here again.
          </p>
          <div class="flex flex-wrap gap-2">
            <Input
              class="max-w-md flex-1"
              placeholder="Text in the default language"
              bind:value={newSourceText}
              onkeydown={(e) => {
                if (e.key === "Enter") addNewSourceText();
              }}
            />
            <Button variant="outline" onclick={addNewSourceText} disabled={!newSourceText.trim()}>
              <PlusIcon class="h-4 w-4" />
              Add Text
            </Button>
            <Button variant="outline" onclick={importSiteTexts} disabled={importingTexts}>
              {#if importingTexts}
                <Loader class="h-4 w-4 animate-spin" />
              {:else}
                <ListPlusIcon class="h-4 w-4" />
              {/if}
              Add Texts from Monitors and Pages
            </Button>
          </div>
          {#if contentRows.length === 0}
            <p class="text-muted-foreground text-sm">No texts to translate yet.</p>
          {:else}
            <div class="space-y-3">
              {#each contentRows as row, index (row.source)}
                <div class="space-y-2 rounded-lg border p-3">
                  <div class="flex items-start justify-between gap-2">
                    <p class="text-sm font-medium break-words whitespace-pre-wrap">{row.source}</p>
                    <Button
                      variant="ghost"
                      size="icon"
                      class="shrink-0"
                      aria-label="Remove text"
                      onclick={() => removeSourceText(index)}
                    >
                      <TrashIcon class="h-4 w-4" />
                    </Button>
                  </div>
                  <div class="grid grid-cols-1 gap-2 md:grid-cols-2">
                    {#each translationLocales as locale (locale.code)}
                      <div class="space-y-1">
                        <Label for="content-{index}-{locale.code}" class="text-muted-foreground text-xs"
                          >{locale.name}</Label
                        >
                        <Input
                          id="content-{index}-{locale.code}"
                          value={row.translations[locale.code] || ""}
                          oninput={(e) => (row.translations[locale.code] = e.currentTarget.value)}
                        />
                      </div>
                    {/each}
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        {/if}
      </Card.Content>
      <Card.Footer class="flex justify-end">
        <Button onclick={saveContentTranslations} disabled={savingContent || translationLocales.length === 0}>
          {#if savingContent}
            <Loader class="h-4 w-4 animate-spin" />
          {:else}
            <SaveIcon class="h-4 w-4" />
          {/if}
          Save Translations
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
