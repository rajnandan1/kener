<script lang="ts">
  import * as Select from "$lib/components/ui/select/index.js";
  import { i18n, t } from "$lib/stores/i18n";
  import Languages from "lucide-svelte/icons/languages";

  // Get the current locale from the store
  let selectedLang = $state($i18n.currentLocale);

  // Update selected lang when store changes
  $effect(() => {
    selectedLang = $i18n.currentLocale;
  });

  // Handle locale change
  async function handleLocaleChange(newLocale: string) {
    if (newLocale && newLocale !== $i18n.currentLocale) {
      await i18n.setLocale(newLocale);
    }
  }

  // Watch for selection changes
  $effect(() => {
    if (selectedLang && selectedLang !== $i18n.currentLocale) {
      handleLocaleChange(selectedLang);
    }
  });

  const triggerContent = $derived(
    $i18n.availableLocales.find((l) => l.code === selectedLang)?.name ?? "Select Language"
  );
</script>

{#if $i18n.availableLocales.length > 1}
  <Select.Root type="single" name="language" bind:value={selectedLang}>
    <Select.Trigger
      size="sm"
      class="ksel hover:text-accent-foreground bg-background/80 dark:bg-background/70 border-foreground/10 cursor-pointer rounded-full border text-xs font-medium shadow-none backdrop-blur-md"
    >
      <Languages class="text-inherit" />
      {triggerContent}
    </Select.Trigger>
    <Select.Content>
      <Select.Group>
        <Select.Label>
          {$t("Select Language")}
        </Select.Label>
        {#each $i18n.availableLocales as locale (locale.code)}
          <Select.Item class="text-xs" value={locale.code} label={locale.name} disabled={locale.disabled}>
            {locale.name}
          </Select.Item>
        {/each}
      </Select.Group>
    </Select.Content>
  </Select.Root>
{/if}
