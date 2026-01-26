<script lang="ts">
  import { Button } from "$lib/components/ui/button/index.js";
  import { Spinner } from "$lib/components/ui/spinner/index.js";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import * as Card from "$lib/components/ui/card/index.js";
  import * as Select from "$lib/components/ui/select/index.js";
  import PlusIcon from "@lucide/svelte/icons/plus";
  import ChevronLeftIcon from "@lucide/svelte/icons/chevron-left";
  import ChevronRightIcon from "@lucide/svelte/icons/chevron-right";
  import PencilIcon from "@lucide/svelte/icons/pencil";
  import FileTextIcon from "@lucide/svelte/icons/file-text";
  import WebhookIcon from "@lucide/svelte/icons/webhook";
  import MailIcon from "@lucide/svelte/icons/mail";
  import MessageSquareIcon from "@lucide/svelte/icons/message-square";
  import HashIcon from "@lucide/svelte/icons/hash";
  import TrashIcon from "@lucide/svelte/icons/trash";
  import { toast } from "svelte-sonner";
  import { goto } from "$app/navigation";
  import * as AlertDialog from "$lib/components/ui/alert-dialog/index.js";

  // Types
  interface Template {
    id: number;
    template_name: string;
    template_type: "EMAIL" | "WEBHOOK" | "SLACK" | "DISCORD";
    template_usage: "ALERT" | "SUBSCRIPTION";
    template_json: string;
    created_at: string;
    updated_at: string;
  }

  // State
  let loading = $state(true);
  let templates = $state<Template[]>([]);
  let totalPages = $state(0);
  let totalCount = $state(0);
  let pageNo = $state(1);
  let typeFilter = $state("ALL");
  let usageFilter = $state("ALL");
  let deleteDialogOpen = $state(false);
  let templateToDelete = $state<Template | null>(null);
  let deleting = $state(false);
  const limit = 10;

  // Fetch templates
  async function fetchData() {
    loading = true;
    try {
      const filter: Record<string, string> = {};
      if (typeFilter !== "ALL") filter.template_type = typeFilter;
      if (usageFilter !== "ALL") filter.template_usage = usageFilter;

      const response = await fetch("/manage/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "getTemplates",
          data: filter
        })
      });
      const result = await response.json();
      if (!result.error) {
        templates = result;
        totalCount = templates.length;
        totalPages = Math.ceil(totalCount / limit);
      }
    } catch (error) {
      console.error("Error fetching templates:", error);
      toast.error("Failed to load templates");
    } finally {
      loading = false;
    }
  }

  function handleTypeChange(value: string | undefined) {
    if (value) {
      typeFilter = value;
      pageNo = 1;
      fetchData();
    }
  }

  function handleUsageChange(value: string | undefined) {
    if (value) {
      usageFilter = value;
      pageNo = 1;
      fetchData();
    }
  }

  function goToPage(page: number) {
    pageNo = page;
  }

  function getTemplateIcon(type: string) {
    switch (type) {
      case "WEBHOOK":
        return WebhookIcon;
      case "EMAIL":
        return MailIcon;
      case "SLACK":
        return HashIcon;
      case "DISCORD":
        return MessageSquareIcon;
      default:
        return FileTextIcon;
    }
  }

  function confirmDelete(template: Template) {
    templateToDelete = template;
    deleteDialogOpen = true;
  }

  async function deleteTemplate() {
    if (!templateToDelete) return;

    deleting = true;
    try {
      const response = await fetch("/manage/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "deleteTemplate",
          data: { id: templateToDelete.id }
        })
      });
      const result = await response.json();
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Template deleted successfully");
        await fetchData();
      }
    } catch (error) {
      toast.error("Failed to delete template");
    } finally {
      deleting = false;
      deleteDialogOpen = false;
      templateToDelete = null;
    }
  }

  // Paginated templates
  const paginatedTemplates = $derived(templates.slice((pageNo - 1) * limit, pageNo * limit));

  $effect(() => {
    fetchData();
  });
</script>

<div class="container mx-auto space-y-6 py-6">
  <!-- Header -->
  <div class="flex items-center justify-between">
    <div class="flex items-center gap-3">
      <FileTextIcon class="text-muted-foreground size-6" />
      <div>
        <h1 class="text-2xl font-bold">Templates</h1>
        <p class="text-muted-foreground text-sm">Manage notification templates for alerts and subscriptions</p>
      </div>
    </div>
    <div class="flex items-center gap-3">
      <Select.Root type="single" value={typeFilter} onValueChange={handleTypeChange}>
        <Select.Trigger class="w-36">
          {typeFilter === "ALL" ? "All Types" : typeFilter}
        </Select.Trigger>
        <Select.Content>
          <Select.Item value="ALL">All Types</Select.Item>
          <Select.Item value="EMAIL">Email</Select.Item>
          <Select.Item value="WEBHOOK">Webhook</Select.Item>
          <Select.Item value="SLACK">Slack</Select.Item>
          <Select.Item value="DISCORD">Discord</Select.Item>
        </Select.Content>
      </Select.Root>
      <Select.Root type="single" value={usageFilter} onValueChange={handleUsageChange}>
        <Select.Trigger class="w-36">
          {usageFilter === "ALL" ? "All Usage" : usageFilter}
        </Select.Trigger>
        <Select.Content>
          <Select.Item value="ALL">All Usage</Select.Item>
          <Select.Item value="ALERT">Alert</Select.Item>
          <Select.Item value="SUBSCRIPTION">Subscription</Select.Item>
        </Select.Content>
      </Select.Root>
      {#if loading}
        <Spinner class="size-5" />
      {/if}
      <Button onclick={() => goto("/manage/app/templates/new")}>
        <PlusIcon class="mr-2 size-4" />
        New Template
      </Button>
    </div>
  </div>

  <!-- Templates List -->
  <div class="grid gap-4">
    {#if paginatedTemplates.length === 0 && !loading}
      <Card.Root>
        <Card.Content class="text-muted-foreground py-8 text-center">No templates found</Card.Content>
      </Card.Root>
    {:else}
      {#each paginatedTemplates as template}
        {@const TemplateIcon = getTemplateIcon(template.template_type)}
        <Card.Root class="hover:bg-muted/30 transition-colors">
          <Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
            <div class="flex items-center gap-3">
              <div class="bg-muted flex size-10 items-center justify-center rounded-lg">
                <TemplateIcon class="size-5" />
              </div>
              <div>
                <Card.Title class="text-base">{template.template_name}</Card.Title>
                <p class="text-muted-foreground text-xs">
                  Created: {new Date(template.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <Badge variant="outline">{template.template_type}</Badge>
              <Badge variant={template.template_usage === "ALERT" ? "default" : "secondary"}>
                {template.template_usage}
              </Badge>
              <Button variant="ghost" size="icon" onclick={() => goto(`/manage/app/templates/${template.id}`)}>
                <PencilIcon class="size-4" />
              </Button>
              <Button variant="ghost" size="icon" onclick={() => confirmDelete(template)}>
                <TrashIcon class="text-destructive size-4" />
              </Button>
            </div>
          </Card.Header>
        </Card.Root>
      {/each}
    {/if}
  </div>

  <!-- Pagination -->
  {#if totalCount > limit}
    {@const startItem = (pageNo - 1) * limit + 1}
    {@const endItem = Math.min(pageNo * limit, totalCount)}
    <div class="flex items-center justify-between">
      <span class="text-muted-foreground text-sm">Showing {startItem}-{endItem} of {totalCount}</span>
      {#if totalPages > 1}
        <div class="flex items-center gap-2">
          <Button variant="outline" size="icon" disabled={pageNo === 1} onclick={() => goToPage(pageNo - 1)}>
            <ChevronLeftIcon class="size-4" />
          </Button>
          <div class="flex items-center gap-1">
            {#each Array.from({ length: totalPages }, (_, i) => i + 1) as page}
              {#if page === 1 || page === totalPages || (page >= pageNo - 1 && page <= pageNo + 1)}
                <Button variant={page === pageNo ? "default" : "ghost"} size="sm" onclick={() => goToPage(page)}>
                  {page}
                </Button>
              {:else if page === pageNo - 2 || page === pageNo + 2}
                <span class="text-muted-foreground px-1">...</span>
              {/if}
            {/each}
          </div>
          <Button variant="outline" size="icon" disabled={pageNo === totalPages} onclick={() => goToPage(pageNo + 1)}>
            <ChevronRightIcon class="size-4" />
          </Button>
        </div>
      {/if}
    </div>
  {/if}
</div>

<!-- Delete Confirmation Dialog -->
<AlertDialog.Root bind:open={deleteDialogOpen}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>Delete Template</AlertDialog.Title>
      <AlertDialog.Description>
        Are you sure you want to delete the template "{templateToDelete?.template_name}"? This action cannot be undone.
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
      <AlertDialog.Action onclick={deleteTemplate} disabled={deleting}>
        {#if deleting}
          <Spinner class="mr-2 size-4" />
        {/if}
        Delete
      </AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
