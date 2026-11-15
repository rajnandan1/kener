<script lang="ts">
  import { getAdminI18n, type AdminLocale } from "./context";

  const { locale, t: adminT, setLocale } = getAdminI18n();
</script>

<label class="inline-flex shrink-0 items-center gap-2 text-sm">
  <span class="sr-only">{$adminT("Panel language")}</span>
  <select
    aria-label={$adminT("Panel language")}
    class="border-input bg-background h-9 rounded-md border px-2 text-sm"
    value={$locale}
    onchange={(event) => setLocale(event.currentTarget.value as AdminLocale)}
  >
    <option value="pl" lang="pl">Polski</option>
    <option value="en" lang="en">English</option>
  </select>
</label>
