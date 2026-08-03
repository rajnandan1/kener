<script lang="ts">
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import { Label } from "$lib/components/ui/label/index.js";
  import { Textarea } from "$lib/components/ui/textarea/index.js";
  import GlobeIcon from "@lucide/svelte/icons/globe";
  import type { ContentTranslations } from "$lib/types/common";

  interface Props {
    translations: ContentTranslations;
    field: string;
    defaultValue: string;
    defaultLocaleName: string;
    locales: { code: string; name: string }[];
    multiline?: boolean;
  }

  let {
    translations = $bindable(),
    field,
    defaultValue,
    defaultLocaleName,
    locales,
    multiline = false
  }: Props = $props();

  let open = $state(false);

  const filledCount = $derived(locales.filter((l) => (translations[l.code]?.[field] ?? "").trim() !== "").length);

  function valueFor(code: string): string {
    return translations[code]?.[field] ?? "";
  }

  function setValue(code: string, value: string) {
    const next = { ...translations };
    if (value.trim() === "") {
      // Empty inputs are dropped, never stored
      if (next[code]) {
        const { [field]: _removed, ...rest } = next[code];
        if (Object.keys(rest).length === 0) {
          delete next[code];
        } else {
          next[code] = rest;
        }
      }
    } else {
      next[code] = { ...next[code], [field]: value };
    }
    translations = next;
  }
</script>

<Dialog.Root bind:open>
  <Dialog.Trigger>
    {#snippet child({ props })}
      <Button {...props} type="button" size="sm" variant="ghost" class="h-6 gap-1 px-2 text-xs">
        <GlobeIcon class="size-3.5" />
        {filledCount}/{locales.length}
      </Button>
    {/snippet}
  </Dialog.Trigger>
  <Dialog.Content class="max-h-[80vh] overflow-y-auto">
    <Dialog.Header>
      <Dialog.Title>Translations</Dialog.Title>
      <Dialog.Description>
        Provide translations for this field. Empty entries fall back to the default-language text.
      </Dialog.Description>
    </Dialog.Header>
    <div class="flex flex-col gap-4">
      <div class="flex flex-col gap-2">
        <Label>{defaultLocaleName} (default)</Label>
        {#if multiline}
          <Textarea value={defaultValue} readonly rows={3} class="bg-muted" />
        {:else}
          <Input value={defaultValue} readonly class="bg-muted" />
        {/if}
      </div>
      {#each locales as locale (locale.code)}
        <div class="flex flex-col gap-2">
          <Label for={`translation-${field}-${locale.code}`}>{locale.name}</Label>
          {#if multiline}
            <Textarea
              id={`translation-${field}-${locale.code}`}
              value={valueFor(locale.code)}
              oninput={(e) => setValue(locale.code, e.currentTarget.value)}
              rows={3}
            />
          {:else}
            <Input
              id={`translation-${field}-${locale.code}`}
              value={valueFor(locale.code)}
              oninput={(e) => setValue(locale.code, e.currentTarget.value)}
            />
          {/if}
        </div>
      {/each}
    </div>
    <Dialog.Footer>
      <Button type="button" onclick={() => (open = false)}>Done</Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
