<script lang="ts">
  import { untrack } from "svelte";
  import { createAdminI18n, type AdminI18nContext } from "./context";
  import type { AdminLocale } from "./messages";
  import LanguageSwitcher from "./LanguageSwitcher.svelte";

  let {
    initialLocale = "pl",
    userText = "Save",
    onContext
  }: { initialLocale?: AdminLocale; userText?: string; onContext?: (context: AdminI18nContext) => void } = $props();
  const context = createAdminI18n(untrack(() => initialLocale));
  const { t: adminT } = context;
  untrack(() => onContext?.(context));
</script>

<LanguageSwitcher />
<p data-testid="translated">{$adminT("Save")}</p>
<p data-testid="user-text">{userText}</p>
