<script lang="ts">
  import { createAdminI18n } from "$lib/admin-i18n/context";
  import LanguageSwitcher from "$lib/admin-i18n/LanguageSwitcher.svelte";
  import ColorPicker from "./ColorPicker.svelte";
  import { Toaster } from "$lib/components/ui/sonner/index.js";
  import { toast } from "svelte-sonner";
  import type { ComponentProps } from "svelte";
  import "../../../routes/layout.css";

  let { onInput, dark = false }: Pick<ComponentProps<typeof ColorPicker>, "onInput"> & { dark?: boolean } = $props();
  const { t: adminT } = createAdminI18n("pl");
  let hex = $state("#16a34a");
  let isOpen = $state(false);
</script>

<div class:dark style:color={dark ? "white" : "black"} style:background-color={dark ? "#09090b" : "white"}>
  <LanguageSwitcher />
  <ColorPicker
    bind:hex
    bind:isOpen
    label={$adminT("Choose a color")}
    {onInput}
    --picker-width="150px"
    --picker-height="150px"
  />
  <output data-testid="picker-hex">{hex}</output>
  <button type="button">Outside target</button>
  <button type="button" onclick={() => toast("Test notice")}>Notify</button>
  <Toaster closeButton />
</div>
