<script lang="ts">
  import { goto } from "$app/navigation";
  import * as Card from "$lib/components/ui/card/index.js";
  import * as Avatar from "$lib/components/ui/avatar/index.js";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import { Spinner } from "$lib/components/ui/spinner/index.js";
  import Plus from "@lucide/svelte/icons/plus";
  import SettingsIcon from "@lucide/svelte/icons/settings";
  import LinkIcon from "@lucide/svelte/icons/link";
  import * as Item from "$lib/components/ui/item/index.js";
  import { toast } from "svelte-sonner";
  import type { PageRecord } from "$lib/server/types/db.js";
  import { resolve } from "$app/paths";
  import clientResolver from "$lib/client/resolver.js";

  interface PageWithMonitors extends PageRecord {
    monitors?: { monitor_tag: string }[];
  }

  let pages = $state<PageWithMonitors[]>([]);
  let loading = $state(true);
  let error = $state<string | null>(null);

  async function fetchPages() {
    loading = true;
    error = null;
    try {
      const response = await fetch(clientResolver(resolve, "/manage/api"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "getPages" })
      });
      const result = await response.json();
      if (result.error) {
        error = result.error;
      } else {
        pages = result;
      }
    } catch (e) {
      error = e instanceof Error ? e.message : "Failed to fetch pages";
    } finally {
      loading = false;
    }
  }

  $effect(() => {
    fetchPages();
  });
</script>

<div class="flex w-full flex-col gap-4 p-4">
  <!-- Header -->
  <div class="mb-4 flex justify-between">
    <div>
      <h1 class="text-2xl font-bold">Pages</h1>
      <p class="text-muted-foreground text-sm">Manage your status pages and their monitors</p>
    </div>
    <Button class="cursor-pointer" onclick={() => goto(clientResolver(resolve, "/manage/app/pages/new"))}>
      <Plus class="mr-1 size-4" />
      New Page
    </Button>
  </div>

  {#if loading}
    <div class="flex w-full flex-col gap-4 [--radius:1rem]">
      <Item.Root variant="muted" class="mx-auto">
        <Item.Media>
          <Spinner />
        </Item.Media>
        <Item.Content>
          <Item.Title class="line-clamp-1">Loading Pages....</Item.Title>
        </Item.Content>
      </Item.Root>
    </div>
  {:else if error}
    <div class="text-destructive py-8 text-center">
      {error}
    </div>
  {:else if pages.length === 0}
    <div class="text-muted-foreground py-8 text-center">No pages found. Create your first page to get started.</div>
  {:else}
    <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {#each pages as page (page.id)}
        <Card.Root class="w-full">
          <Card.Header>
            <div class="flex items-start gap-3">
              <Avatar.Root class="size-10 rounded-sm">
                <Avatar.Image src={page.page_logo} alt={page.page_title} />
                <Avatar.Fallback>
                  {page.page_title.charAt(0).toUpperCase()}
                </Avatar.Fallback>
              </Avatar.Root>
              <div class="flex-1">
                <Card.Title class="text-lg">{page.page_title}</Card.Title>
                <Card.Description class="line-clamp-2">{page.page_header}</Card.Description>
              </div>
            </div>
          </Card.Header>
          <Card.Content class="h-18">
            <div class="flex flex-wrap gap-2">
              <Button
                variant="link"
                class="gap-1"
                href={`/${page.page_path}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                /{page.page_path}
              </Button>
              {#if page.monitors && page.monitors.length > 0}
                <Badge variant="secondary">{page.monitors.length} monitor{page.monitors.length > 1 ? "s" : ""}</Badge>
              {:else}
                <Badge variant="outline" class="text-muted-foreground">No monitors</Badge>
              {/if}
            </div>
            {#if page.page_subheader}
              <p class="text-muted-foreground mt-2 line-clamp-3 text-xs">{page.page_subheader}</p>
            {/if}
          </Card.Content>
          <Card.Footer class="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onclick={() => goto(clientResolver(resolve, `/manage/app/pages/${page.id}`))}
            >
              <SettingsIcon class="mr-1 size-4" />
              Edit
            </Button>
          </Card.Footer>
        </Card.Root>
      {/each}
    </div>
  {/if}
</div>
