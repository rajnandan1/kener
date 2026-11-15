<script lang="ts">
  import { untrack } from "svelte";
  import { createAdminI18n } from "./context";
  import type { AdminLocale } from "./messages";
  import LanguageSwitcher from "./LanguageSwitcher.svelte";

  let { initialLocale = "pl", userText = "Save" }: { initialLocale?: AdminLocale; userText?: string } = $props();
  const { t: adminT } = createAdminI18n(untrack(() => initialLocale));
</script>

<LanguageSwitcher />
<p data-testid="translated">{$adminT("Save")}</p>
<p data-testid="user-text">{userText}</p>
