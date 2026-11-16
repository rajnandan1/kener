<script lang="ts">
  import { getAdminI18n } from "$lib/admin-i18n/context";
  const { t: adminT } = getAdminI18n();

  import LanguageSwitcher from "$lib/admin-i18n/LanguageSwitcher.svelte";
  import { Button } from "$lib/components/ui/button/index.js";
  import { Separator } from "$lib/components/ui/separator/index.js";
  import * as Sidebar from "$lib/components/ui/sidebar/index.js";
  import { resolve } from "$app/paths";
  import clientResolver from "$lib/client/resolver.js";

  let { title = "" }: { title?: string } = $props();
</script>

<header class="flex min-h-(--header-height) shrink-0 items-center border-b">
  <div class="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 gap-y-2 px-4 py-1.5 lg:flex lg:px-6">
    <div class="flex min-w-0 items-center gap-1 lg:flex-1">
      <Sidebar.Trigger class="-ms-1 shrink-0" />
      <Separator orientation="vertical" class="mx-2 shrink-0 data-[orientation=vertical]:h-4" />
      <h1 class="min-w-0 text-base font-medium break-words">{$adminT(String(title ?? ""))}</h1>
    </div>
    <LanguageSwitcher />
    <div class="col-span-2 flex flex-wrap items-center justify-end gap-2">
      <Button
        href={clientResolver(resolve, "/")}
        variant="secondary"
        size="sm"
        target="_blank"
        rel="noopener noreferrer"
      >
        {$adminT("Status Page")}
      </Button>
      <Button href="https://kener.ing/docs" variant="secondary" size="sm" target="_blank" rel="noopener noreferrer">
        {$adminT("Documentation")}
      </Button>
    </div>
  </div>
</header>
