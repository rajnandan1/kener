<script lang="ts">
  import * as Card from "$lib/components/ui/card/index.js";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
  import * as Select from "$lib/components/ui/select/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import { Label } from "$lib/components/ui/label/index.js";
  import { Switch } from "$lib/components/ui/switch/index.js";
  import { Textarea } from "$lib/components/ui/textarea/index.js";
  import { toast } from "svelte-sonner";
  import Loader from "@lucide/svelte/icons/loader";
  import PlusIcon from "@lucide/svelte/icons/plus";
  import XIcon from "@lucide/svelte/icons/x";
  import ArrowUpIcon from "@lucide/svelte/icons/arrow-up";
  import ArrowDownIcon from "@lucide/svelte/icons/arrow-down";
  import SettingsIcon from "@lucide/svelte/icons/settings";
  import ArrowRightLeftIcon from "@lucide/svelte/icons/arrow-right-left";
  import type { MonitorRecord } from "$lib/server/types/db.js";
  import { resolve } from "$app/paths";
  import clientResolver from "$lib/client/resolver.js";

  interface PageMonitorRow {
    monitor_tag: string;
    position: number;
    page_monitor_group_id: number | null;
  }

  interface PageMonitorGroupRow {
    id: number;
    name: string;
    description?: string | null;
    default_expanded: boolean;
    adopt_child_status: boolean;
    position: number;
    monitors: Array<{ monitor_tag: string; position: number }>;
  }

  type TopLevelItem = { kind: "monitor"; monitor_tag: string } | { kind: "group"; id: number };
  type GroupPayload = {
    id: number | undefined;
    name: string;
    description?: string | null;
    default_expanded: boolean;
    adopt_child_status: boolean;
    position: number;
    monitors: Array<{ monitor_tag: string; position: number }>;
  };

  interface Props {
    pageId: number;
    monitors: MonitorRecord[];
    initialMonitors?: PageMonitorRow[];
    initialMonitorGroups?: PageMonitorGroupRow[];
  }

  let { pageId, monitors, initialMonitors = [], initialMonitorGroups = [] }: Props = $props();

  let topLevelOrder = $state<TopLevelItem[]>([]);
  let pageMonitorGroups = $state<PageMonitorGroupRow[]>([]);
  let selectedMonitorTag = $state("");
  let savingStructure = $state(false);
  let groupDialogOpen = $state(false);
  let editingGroupId = $state<number | null>(null);
  let groupForm = $state({
    name: "",
    description: "",
    default_expanded: false,
    adopt_child_status: false,
  });
  let nextTempGroupId = -1;
  let initializedPageId = $state<number | null>(null);

  function applyInitialStructure(monitorsInput: PageMonitorRow[], groupsInput: PageMonitorGroupRow[]) {
    pageMonitorGroups = groupsInput.map((group) => ({
      ...group,
      monitors: [...group.monitors].sort((a, b) => a.position - b.position),
    }));

    const topLevelMonitors = monitorsInput
      .filter((monitor) => monitor.page_monitor_group_id === null)
      .sort((a, b) => a.position - b.position)
      .map<TopLevelItem>((monitor) => ({
        kind: "monitor",
        monitor_tag: monitor.monitor_tag,
      }));

    const topLevelGroups = pageMonitorGroups
      .sort((a, b) => a.position - b.position)
      .map<TopLevelItem>((group) => ({
        kind: "group",
        id: group.id,
      }));

    topLevelOrder = [...topLevelMonitors, ...topLevelGroups].sort((a, b) => {
      const aPosition =
        a.kind === "monitor"
          ? monitorsInput.find((monitor) => monitor.monitor_tag === a.monitor_tag)?.position ?? 0
          : pageMonitorGroups.find((group) => group.id === a.id)?.position ?? 0;
      const bPosition =
        b.kind === "monitor"
          ? monitorsInput.find((monitor) => monitor.monitor_tag === b.monitor_tag)?.position ?? 0
          : pageMonitorGroups.find((group) => group.id === b.id)?.position ?? 0;
      return aPosition - bPosition;
    });

    const minGroupId = pageMonitorGroups.reduce((minValue, group) => Math.min(minValue, group.id), 0);
    nextTempGroupId = Math.min(-1, minGroupId - 1);
  }

  $effect(() => {
    if (pageId !== initializedPageId) {
      applyInitialStructure(initialMonitors, initialMonitorGroups);
      initializedPageId = pageId;
    }
  });

  let assignedMonitorTags = $derived.by(() => {
    const tags = new Set<string>();
    for (const item of topLevelOrder) {
      if (item.kind === "monitor") {
        tags.add(item.monitor_tag);
      }
    }

    for (const group of pageMonitorGroups) {
      for (const monitor of group.monitors) {
        tags.add(monitor.monitor_tag);
      }
    }

    return tags;
  });

  let availableMonitors = $derived(monitors.filter((monitor) => !assignedMonitorTags.has(monitor.tag)));

  function getMonitorName(monitorTag: string): string {
    return monitors.find((monitor) => monitor.tag === monitorTag)?.name || monitorTag;
  }

  function getGroupById(groupId: number): PageMonitorGroupRow | undefined {
    return pageMonitorGroups.find((group) => group.id === groupId);
  }

  function buildStructurePayload(order: TopLevelItem[], groups: PageMonitorGroupRow[]) {
    const monitorsPayload = order
      .map((item, index) =>
        item.kind === "monitor"
          ? {
              monitor_tag: item.monitor_tag,
              position: index,
            }
          : null,
      )
      .filter((item): item is { monitor_tag: string; position: number } => item !== null);

    const groupsPayload = order
      .map((item, index) => {
        if (item.kind !== "group") return null;
        const group = groups.find((candidate) => candidate.id === item.id);
        if (!group) return null;

        const payload: GroupPayload = {
          id: group.id > 0 ? group.id : undefined,
          name: group.name,
          description: group.description || null,
          default_expanded: group.default_expanded,
          adopt_child_status: group.adopt_child_status,
          position: index,
          monitors: group.monitors.map((monitor, monitorIndex) => ({
            monitor_tag: monitor.monitor_tag,
            position: monitorIndex,
          })),
        };

        return payload;
      })
      .filter((item): item is GroupPayload => item !== null);

    return {
      monitors: monitorsPayload,
      monitor_groups: groupsPayload,
    };
  }

  async function persistStructure(nextOrder: TopLevelItem[], nextGroups: PageMonitorGroupRow[]) {
    savingStructure = true;
    try {
      const response = await fetch(clientResolver(resolve, "/manage/api"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "replacePageMonitorStructure",
          data: {
            page_id: pageId,
            ...buildStructurePayload(nextOrder, nextGroups),
          },
        }),
      });

      const result = await response.json();
      if (result.error) {
        toast.error(result.error);
        return false;
      }

      applyInitialStructure(result.monitors || [], result.monitor_groups || []);
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save page monitor structure");
      return false;
    } finally {
      savingStructure = false;
    }
  }

  async function addMonitorToPage() {
    if (!selectedMonitorTag) return;

    const nextOrder = [...topLevelOrder, { kind: "monitor" as const, monitor_tag: selectedMonitorTag }];
    const success = await persistStructure(nextOrder, pageMonitorGroups);
    if (success) {
      selectedMonitorTag = "";
    }
  }

  function openCreateGroupDialog() {
    editingGroupId = null;
    groupForm = {
      name: "",
      description: "",
      default_expanded: false,
      adopt_child_status: false,
    };
    groupDialogOpen = true;
  }

  function openEditGroupDialog(groupId: number) {
    const group = getGroupById(groupId);
    if (!group) return;

    editingGroupId = groupId;
    groupForm = {
      name: group.name,
      description: group.description || "",
      default_expanded: group.default_expanded,
      adopt_child_status: group.adopt_child_status,
    };
    groupDialogOpen = true;
  }

  async function saveGroupDialog() {
    const groupName = groupForm.name.trim();
    const groupDescription = groupForm.description.trim() || null;
    if (!groupName) {
      toast.error("Group name is required");
      return;
    }

    let nextOrder = [...topLevelOrder];
    let nextGroups = pageMonitorGroups.map((group) => ({
      ...group,
      monitors: [...group.monitors],
    }));

    if (editingGroupId === null) {
      const tempId = nextTempGroupId--;
      nextGroups = [
        ...nextGroups,
        {
          id: tempId,
          name: groupName,
          description: groupDescription,
          default_expanded: groupForm.default_expanded,
          adopt_child_status: groupForm.adopt_child_status,
          position: nextOrder.length,
          monitors: [],
        },
      ];
      nextOrder = [...nextOrder, { kind: "group", id: tempId }];
    } else {
      nextGroups = nextGroups.map((group) =>
        group.id === editingGroupId
          ? {
              ...group,
              name: groupName,
              description: groupDescription,
              default_expanded: groupForm.default_expanded,
              adopt_child_status: groupForm.adopt_child_status,
            }
          : group,
      );
    }

    const success = await persistStructure(nextOrder, nextGroups);
    if (success) {
      groupDialogOpen = false;
    }
  }

  async function moveTopLevelItem(index: number, direction: "up" | "down") {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= topLevelOrder.length) return;

    const nextOrder = [...topLevelOrder];
    [nextOrder[index], nextOrder[newIndex]] = [nextOrder[newIndex], nextOrder[index]];
    await persistStructure(nextOrder, pageMonitorGroups);
  }

  async function moveGroupMonitor(groupId: number, index: number, direction: "up" | "down") {
    const group = getGroupById(groupId);
    if (!group) return;

    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= group.monitors.length) return;

    const nextGroups = pageMonitorGroups.map((candidate) => {
      if (candidate.id !== groupId) return { ...candidate, monitors: [...candidate.monitors] };

      const nextMonitors = [...candidate.monitors];
      [nextMonitors[index], nextMonitors[newIndex]] = [nextMonitors[newIndex], nextMonitors[index]];
      return {
        ...candidate,
        monitors: nextMonitors,
      };
    });

    await persistStructure(topLevelOrder, nextGroups);
  }

  async function removeMonitorFromPage(monitorTag: string, groupId: number | null) {
    const nextOrder =
      groupId === null ? topLevelOrder.filter((item) => !(item.kind === "monitor" && item.monitor_tag === monitorTag)) : [...topLevelOrder];
    const nextGroups =
      groupId === null
        ? pageMonitorGroups.map((group) => ({ ...group, monitors: [...group.monitors] }))
        : pageMonitorGroups.map((group) =>
            group.id === groupId
              ? {
                  ...group,
                  monitors: group.monitors.filter((monitor) => monitor.monitor_tag !== monitorTag),
                }
              : { ...group, monitors: [...group.monitors] },
          );

    await persistStructure(nextOrder, nextGroups);
  }

  async function deleteGroup(groupId: number) {
    const groupIndex = topLevelOrder.findIndex((item) => item.kind === "group" && item.id === groupId);
    const group = getGroupById(groupId);
    if (groupIndex < 0 || !group) return;

    const promotedChildren = group.monitors.map<TopLevelItem>((monitor) => ({
      kind: "monitor",
      monitor_tag: monitor.monitor_tag,
    }));

    const nextOrder = [
      ...topLevelOrder.slice(0, groupIndex),
      ...promotedChildren,
      ...topLevelOrder.slice(groupIndex + 1),
    ];
    const nextGroups = pageMonitorGroups
      .filter((candidate) => candidate.id !== groupId)
      .map((candidate) => ({ ...candidate, monitors: [...candidate.monitors] }));

    await persistStructure(nextOrder, nextGroups);
  }

  async function moveMonitorToDestination(
    monitorTag: string,
    sourceGroupId: number | null,
    destinationGroupId: number | null,
  ) {
    if (sourceGroupId === destinationGroupId) return;

    const nextOrder = topLevelOrder.filter(
      (item) => !(sourceGroupId === null && item.kind === "monitor" && item.monitor_tag === monitorTag),
    );
    let nextGroups = pageMonitorGroups.map((group) => ({
      ...group,
      monitors:
        group.id === sourceGroupId
          ? group.monitors.filter((monitor) => monitor.monitor_tag !== monitorTag)
          : [...group.monitors],
    }));

    if (destinationGroupId === null) {
      nextOrder.push({ kind: "monitor", monitor_tag: monitorTag });
    } else {
      nextGroups = nextGroups.map((group) =>
        group.id === destinationGroupId
          ? {
              ...group,
              monitors: [...group.monitors, { monitor_tag: monitorTag, position: group.monitors.length }],
            }
          : group,
      );
    }

    await persistStructure(nextOrder, nextGroups);
  }
</script>

<Card.Root>
  <Card.Header>
    <Card.Title>Page Monitors</Card.Title>
    <Card.Description>Select which monitors and groups to display on this page</Card.Description>
  </Card.Header>
  <Card.Content class="space-y-4">
    <div class="flex flex-wrap gap-2">
      <Select.Root type="single" bind:value={selectedMonitorTag}>
        <Select.Trigger class="min-w-[18rem] flex-1">
          {#if selectedMonitorTag}
            {getMonitorName(selectedMonitorTag)} ({selectedMonitorTag})
          {:else}
            Select a monitor to add
          {/if}
        </Select.Trigger>
        <Select.Content>
          {#each availableMonitors as monitor (monitor.tag)}
            <Select.Item value={monitor.tag}>{monitor.name} ({monitor.tag})</Select.Item>
          {/each}
          {#if availableMonitors.length === 0}
            <div class="text-muted-foreground px-2 py-1 text-sm">No available monitors</div>
          {/if}
        </Select.Content>
      </Select.Root>
      <Button onclick={addMonitorToPage} disabled={savingStructure || !selectedMonitorTag}>
        {#if savingStructure}
          <Loader class="h-4 w-4 animate-spin" />
        {:else}
          <PlusIcon class="h-4 w-4" />
          Add Monitor
        {/if}
      </Button>
      <Button variant="outline" onclick={openCreateGroupDialog} disabled={savingStructure}>
        <PlusIcon class="h-4 w-4" />
        Add Group
      </Button>
    </div>

    <div class="space-y-2">
      <Label>Current Page Structure</Label>
      {#if topLevelOrder.length > 0}
        <div class="space-y-2">
          {#each topLevelOrder as item, index (`${item.kind}-${item.kind === 'monitor' ? item.monitor_tag : item.id}`)}
            {#if item.kind === "monitor"}
              <div class="bg-muted flex items-center justify-between rounded-lg p-3">
                <div>
                  <p class="font-medium">{getMonitorName(item.monitor_tag)}</p>
                  <p class="text-muted-foreground text-xs">{item.monitor_tag}</p>
                </div>
                <div class="flex items-center gap-1">
                  <DropdownMenu.Root>
                    <DropdownMenu.Trigger class="cursor-pointer">
                      {#snippet child({ props })}
                        <Button {...props} variant="ghost" size="sm" disabled={savingStructure}>
                          <ArrowRightLeftIcon class="h-4 w-4" />
                        </Button>
                      {/snippet}
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Content align="end">
                      {#if pageMonitorGroups.length === 0}
                        <DropdownMenu.Item disabled>No groups available</DropdownMenu.Item>
                      {/if}
                      {#each pageMonitorGroups as group (group.id)}
                        <DropdownMenu.Item onclick={() => moveMonitorToDestination(item.monitor_tag, null, group.id)}>
                          Move to {group.name}
                        </DropdownMenu.Item>
                      {/each}
                    </DropdownMenu.Content>
                  </DropdownMenu.Root>
                  <Button
                    variant="ghost"
                    size="sm"
                    onclick={() => moveTopLevelItem(index, "up")}
                    disabled={index === 0 || savingStructure}
                  >
                    <ArrowUpIcon class="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onclick={() => moveTopLevelItem(index, "down")}
                    disabled={index === topLevelOrder.length - 1 || savingStructure}
                  >
                    <ArrowDownIcon class="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onclick={() => removeMonitorFromPage(item.monitor_tag, null)}
                    disabled={savingStructure}
                  >
                    <XIcon class="h-4 w-4" />
                  </Button>
                </div>
              </div>
            {:else}
              {@const group = getGroupById(item.id)}
              {#if group}
                <div class="overflow-hidden rounded-lg border">
                  <div class="bg-muted/50 flex items-center justify-between p-3">
                    <div>
                      <p class="font-medium">{group.name}</p>
                      {#if group.description}
                        <p class="text-muted-foreground mt-1 line-clamp-2 text-xs">{group.description}</p>
                      {/if}
                      <p class="text-muted-foreground text-xs">
                        {group.monitors.length} monitor{group.monitors.length === 1 ? "" : "s"}
                        {group.default_expanded ? " • Expanded by default" : ""}
                        {group.adopt_child_status ? " • Adopts child status" : ""}
                      </p>
                    </div>
                    <div class="flex items-center gap-1">
                      <Button variant="ghost" size="sm" onclick={() => openEditGroupDialog(group.id)} disabled={savingStructure}>
                        <SettingsIcon class="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onclick={() => moveTopLevelItem(index, "up")}
                        disabled={index === 0 || savingStructure}
                      >
                        <ArrowUpIcon class="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onclick={() => moveTopLevelItem(index, "down")}
                        disabled={index === topLevelOrder.length - 1 || savingStructure}
                      >
                        <ArrowDownIcon class="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onclick={() => deleteGroup(group.id)} disabled={savingStructure}>
                        <XIcon class="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div class="space-y-2 border-t p-3">
                    {#if group.monitors.length > 0}
                      {#each group.monitors as monitor, groupIndex (monitor.monitor_tag)}
                        <div class="bg-background flex items-center justify-between rounded-md border p-3">
                          <div>
                            <p class="font-medium">{getMonitorName(monitor.monitor_tag)}</p>
                            <p class="text-muted-foreground text-xs">{monitor.monitor_tag}</p>
                          </div>
                          <div class="flex items-center gap-1">
                            <DropdownMenu.Root>
                              <DropdownMenu.Trigger class="cursor-pointer">
                                {#snippet child({ props })}
                                  <Button {...props} variant="ghost" size="sm" disabled={savingStructure}>
                                    <ArrowRightLeftIcon class="h-4 w-4" />
                                  </Button>
                                {/snippet}
                              </DropdownMenu.Trigger>
                              <DropdownMenu.Content align="end">
                                <DropdownMenu.Item
                                  onclick={() => moveMonitorToDestination(monitor.monitor_tag, group.id, null)}
                                >
                                  Move to top level
                                </DropdownMenu.Item>
                                {#each pageMonitorGroups.filter((candidate) => candidate.id !== group.id) as destination (destination.id)}
                                  <DropdownMenu.Item
                                    onclick={() => moveMonitorToDestination(monitor.monitor_tag, group.id, destination.id)}
                                  >
                                    Move to {destination.name}
                                  </DropdownMenu.Item>
                                {/each}
                              </DropdownMenu.Content>
                            </DropdownMenu.Root>
                            <Button
                              variant="ghost"
                              size="sm"
                              onclick={() => moveGroupMonitor(group.id, groupIndex, "up")}
                              disabled={groupIndex === 0 || savingStructure}
                            >
                              <ArrowUpIcon class="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onclick={() => moveGroupMonitor(group.id, groupIndex, "down")}
                              disabled={groupIndex === group.monitors.length - 1 || savingStructure}
                            >
                              <ArrowDownIcon class="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onclick={() => removeMonitorFromPage(monitor.monitor_tag, group.id)}
                              disabled={savingStructure}
                            >
                              <XIcon class="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      {/each}
                    {:else}
                      <div class="text-muted-foreground rounded-md border border-dashed px-3 py-4 text-sm">
                        No monitors in this group yet
                      </div>
                    {/if}
                  </div>
                </div>
              {/if}
            {/if}
          {/each}
        </div>
      {:else}
        <div class="text-muted-foreground bg-muted rounded-lg p-4 text-center text-sm">
          No monitors or groups added to this page yet
        </div>
      {/if}
    </div>
  </Card.Content>
</Card.Root>

<Dialog.Root bind:open={groupDialogOpen}>
  <Dialog.Content class="sm:max-w-md">
    <Dialog.Header>
      <Dialog.Title>{editingGroupId === null ? "Create Group" : "Edit Group"}</Dialog.Title>
      <Dialog.Description>Configure how this page group appears on the public status page.</Dialog.Description>
    </Dialog.Header>

    <div class="space-y-4 py-2">
      <div class="space-y-2">
        <Label for="page-group-name">Group name</Label>
        <Input id="page-group-name" bind:value={groupForm.name} placeholder="Infrastructure" />
      </div>

      <div class="space-y-2">
        <Label for="page-group-description">Description</Label>
        <Textarea
          id="page-group-description"
          bind:value={groupForm.description}
          placeholder="What belongs in this group?"
          rows={3}
        />
      </div>

      <div class="flex items-center justify-between rounded-lg border px-3 py-3">
        <div class="space-y-1">
          <Label for="page-group-default-expanded">Expanded by default</Label>
          <p class="text-muted-foreground text-xs">Show this group expanded when the status page first loads.</p>
        </div>
        <Switch id="page-group-default-expanded" bind:checked={groupForm.default_expanded} />
      </div>

      <div class="flex items-center justify-between rounded-lg border px-3 py-3">
        <div class="space-y-1">
          <Label for="page-group-adopt-status">Adopt child status</Label>
          <p class="text-muted-foreground text-xs">Show the worst status of the monitors inside this group.</p>
        </div>
        <Switch id="page-group-adopt-status" bind:checked={groupForm.adopt_child_status} />
      </div>
    </div>

    <Dialog.Footer>
      <Button variant="outline" onclick={() => (groupDialogOpen = false)} disabled={savingStructure}>Cancel</Button>
      <Button onclick={saveGroupDialog} disabled={savingStructure || groupForm.name.trim().length === 0}>
        {#if savingStructure}
          <Loader class="h-4 w-4 animate-spin" />
          Saving...
        {:else}
          Save Group
        {/if}
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
