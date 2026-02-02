<script lang="ts">
  import { Label } from "$lib/components/ui/label/index.js";
  import * as Card from "$lib/components/ui/card/index.js";
  import { Checkbox } from "$lib/components/ui/checkbox/index.js";
  import FileTextIcon from "@lucide/svelte/icons/file-text";
  import { toast } from "svelte-sonner";

  interface PageWithMonitors {
    id: number;
    page_path: string;
    page_title: string;
    monitors?: { monitor_tag: string }[];
  }

  interface Props {
    monitorTag: string;
    allPages: PageWithMonitors[];
    onPagesUpdated: () => void;
  }

  let { monitorTag, allPages, onPagesUpdated }: Props = $props();

  let savingPages = $state(false);

  // Check if monitor is on a specific page
  function isMonitorOnPage(pageId: number): boolean {
    const page = allPages.find((p) => p.id === pageId);
    return page?.monitors?.some((m) => m.monitor_tag === monitorTag) ?? false;
  }

  // Toggle monitor on a page
  async function toggleMonitorOnPage(pageId: number, checked: boolean) {
    savingPages = true;
    try {
      const action = checked ? "addMonitorToPage" : "removeMonitorFromPage";
      const response = await fetch("/manage/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          data: {
            page_id: pageId,
            monitor_tag: monitorTag
          }
        })
      });

      const result = await response.json();
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(checked ? "Monitor added to page" : "Monitor removed from page");
        onPagesUpdated();
      }
    } catch (e) {
      toast.error("Failed to update page");
    } finally {
      savingPages = false;
    }
  }
</script>

<Card.Root>
  <Card.Header>
    <Card.Title class="flex items-center gap-2">
      <FileTextIcon class="size-5" />
      Page Visibility
    </Card.Title>
    <Card.Description>Select which pages this monitor should appear on</Card.Description>
  </Card.Header>
  <Card.Content>
    {#if allPages.length === 0}
      <p class="text-muted-foreground text-sm">No pages available. Create a page first.</p>
    {:else}
      <div class="flex flex-row flex-wrap gap-2 space-y-3">
        {#each allPages as page (page.id)}
          <div class="flex h-12 items-center space-x-3 rounded-xl border px-4 py-2">
            <Checkbox
              id="page-{page.id}"
              checked={isMonitorOnPage(page.id)}
              onCheckedChange={(checked) => toggleMonitorOnPage(page.id, !!checked)}
              disabled={savingPages}
            />
            <Label for="page-{page.id}" class="flex cursor-pointer flex-row">
              <span class="font-medium">{page.page_title}</span>
              <span class="text-muted-foreground text-xs">{page.page_path}</span>
            </Label>
          </div>
        {/each}
      </div>
    {/if}
  </Card.Content>
</Card.Root>
