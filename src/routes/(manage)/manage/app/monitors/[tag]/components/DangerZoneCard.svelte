<script lang="ts">
  import { Button } from "$lib/components/ui/button/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import { Label } from "$lib/components/ui/label/index.js";
  import * as Card from "$lib/components/ui/card/index.js";
  import TrashIcon from "@lucide/svelte/icons/trash";
  import Loader from "@lucide/svelte/icons/loader";
  import { toast } from "svelte-sonner";
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import clientResolver from "$lib/client/resolver.js";

  interface Props {
    monitorTag: string;
  }

  let { monitorTag }: Props = $props();

  let deleting = $state(false);
  let deleteConfirmText = $state("");

  async function deleteMonitor() {
    if (!monitorTag) return;
    if (deleteConfirmText !== `delete ${monitorTag}`) {
      toast.error("Please type the correct confirmation text");
      return;
    }

    deleting = true;
    try {
      const response = await fetch(clientResolver(resolve, "/manage/api"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "deleteMonitor",
          data: { tag: monitorTag }
        })
      });

      const result = await response.json();
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Monitor deleted successfully");
        goto(clientResolver(resolve, "/manage/app/monitors"));
      }
    } catch (e) {
      toast.error("Failed to delete monitor");
    } finally {
      deleting = false;
    }
  }
</script>

<Card.Root class="border-destructive">
  <Card.Header>
    <Card.Title class="text-destructive flex items-center gap-2">
      <TrashIcon class="size-5" />
      Danger Zone
    </Card.Title>
    <Card.Description>Deleting a monitor is irreversible. Please be sure before deleting.</Card.Description>
  </Card.Header>
  <Card.Content>
    <div class="flex items-end gap-4">
      <div class="flex-1 space-y-2">
        <Label for="deleteConfirm">
          Type <span class="text-destructive font-mono">delete {monitorTag}</span> to confirm
        </Label>
        <Input id="deleteConfirm" bind:value={deleteConfirmText} placeholder="delete {monitorTag}" />
      </div>
      <Button
        variant="destructive"
        onclick={deleteMonitor}
        disabled={deleting || deleteConfirmText !== `delete ${monitorTag}`}
      >
        {#if deleting}
          <Loader class="mr-2 size-4 animate-spin" />
          Deleting...
        {:else}
          <TrashIcon class="mr-2 size-4" />
          Delete Monitor
        {/if}
      </Button>
    </div>
  </Card.Content>
</Card.Root>
