<script lang="ts">
  import { goto } from "$app/navigation";
  import { onMount } from "svelte";
  import * as Table from "$lib/components/ui/table/index.js";
  import * as Avatar from "$lib/components/ui/avatar/index.js";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import { Spinner } from "$lib/components/ui/spinner/index.js";
  import Plus from "@lucide/svelte/icons/plus";
  import SettingsIcon from "@lucide/svelte/icons/settings";
  import * as Item from "$lib/components/ui/item/index.js";
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

  onMount(() => {
    fetchPages();
  });
</script>

<div class="flex w-full flex-col gap-4 p-4">
  <!-- Header -->
  <div class="mb-4 flex justify-end">
    <Button class="cursor-pointer" onclick={() => goto(clientResolver(resolve, "/manage/app/pages/new"))}>
      <Plus class="size-4" />
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
    <div class="ktable rounded-xl border">
      <Table.Root>
        <Table.Header>
          <Table.Row>
            <Table.Head class="w-[340px]">Page</Table.Head>
            <Table.Head class="w-[220px]">Path</Table.Head>
            <Table.Head class="w-[150px]">Monitors</Table.Head>
            <Table.Head class="w-[120px] text-right"></Table.Head>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {#each pages as page (page.id)}
            <Table.Row>
              <Table.Cell>
                <div class="flex items-start gap-3">
                  <Avatar.Root class="size-8 rounded-sm">
                    {#if page.page_logo}
                      <Avatar.Image src={clientResolver(resolve, page.page_logo)} alt={page.page_title} />
                    {/if}
                    <Avatar.Fallback>
                      {page.page_title.charAt(0).toUpperCase()}
                    </Avatar.Fallback>
                  </Avatar.Root>
                  <div class="min-w-0">
                    <div class="font-medium">{page.page_title}</div>
                    <p class="text-muted-foreground line-clamp-2 text-xs">{page.page_header}</p>
                  </div>
                </div>
              </Table.Cell>
              <Table.Cell>
                <Button
                  variant="link"
                  class="h-auto px-0"
                  href={clientResolver(resolve, `/${page.page_path}`)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  /{page.page_path}
                </Button>
              </Table.Cell>
              <Table.Cell>
                {#if page.monitors && page.monitors.length > 0}
                  <Badge variant="secondary">{page.monitors.length} monitor{page.monitors.length > 1 ? "s" : ""}</Badge>
                {:else}
                  <Badge variant="outline" class="text-muted-foreground">No monitors</Badge>
                {/if}
              </Table.Cell>

              <Table.Cell class="text-right">
                <Button
                  variant="outline"
                  target="_blank"
                  size="sm"
                  href={clientResolver(resolve, `/${page.page_path}`)}
                >
                  View
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onclick={() => goto(clientResolver(resolve, `/manage/app/pages/${page.id}`))}
                >
                  <SettingsIcon class="mr-1 size-4" />
                  Edit
                </Button>
              </Table.Cell>
            </Table.Row>
          {/each}
        </Table.Body>
      </Table.Root>
    </div>
  {/if}
</div>
