<script lang="ts">
  import { Button } from "$lib/components/ui/button/index.js";
  import { Separator } from "$lib/components/ui/separator/index.js";
  import * as Sidebar from "$lib/components/ui/sidebar/index.js";
  import { page } from "$app/stores";

  let { title = "" }: { title?: string } = $props();
</script>

<header
  class="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)"
>
  <div class="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
    <Sidebar.Trigger class="-ms-1" />
    <Separator orientation="vertical" class="mx-2 data-[orientation=vertical]:h-4" />
    <h1 class="text-base font-medium">{title}</h1>
    <div class="ms-auto flex items-center gap-2">
      <Button
        href="/"
        variant="secondary"
        size="sm"
        class="dark:text-foreground hidden sm:flex"
        target="_blank"
        rel="noopener noreferrer"
      >
        Status Page
      </Button>
    </div>
  </div>
</header>
