<script lang="ts">
  import { Button } from "$lib/components/ui/button/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import { Label } from "$lib/components/ui/label/index.js";
  import { Textarea } from "$lib/components/ui/textarea/index.js";
  import { Spinner } from "$lib/components/ui/spinner/index.js";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import * as Card from "$lib/components/ui/card/index.js";
  import * as Select from "$lib/components/ui/select/index.js";
  import * as Breadcrumb from "$lib/components/ui/breadcrumb/index.js";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
  import SaveIcon from "@lucide/svelte/icons/save";
  import Loader from "@lucide/svelte/icons/loader";
  import PlusIcon from "@lucide/svelte/icons/plus";
  import TrashIcon from "@lucide/svelte/icons/trash";
  import PencilIcon from "@lucide/svelte/icons/pencil";
  import XIcon from "@lucide/svelte/icons/x";
  import MoreVerticalIcon from "@lucide/svelte/icons/more-vertical";
  import CheckIcon from "@lucide/svelte/icons/check";
  import AlertTriangleIcon from "@lucide/svelte/icons/alert-triangle";
  import type { PageProps } from "./$types";
  import type { MonitorRecord, IncidentRecord, IncidentCommentRecord } from "$lib/server/types/db.js";
  import { goto } from "$app/navigation";
  import { toast } from "svelte-sonner";
  import { format } from "date-fns";
  import GC from "$lib/global-constants";
  import { mode } from "mode-watcher";
  import { resolve } from "$app/paths";
  import clientResolver from "$lib/client/resolver.js";

  import CodeMirror from "svelte-codemirror-editor";
  import { markdown } from "@codemirror/lang-markdown";
  import { githubLight, githubDark } from "@uiw/codemirror-theme-github";
  import mdToHTML from "$lib/marked";

  let { params }: PageProps = $props();
  const isNew = $derived(params.incident_id === "new");

  // Form state
  let loading = $state(true);
  let saving = $state(false);
  let error = $state<string | null>(null);

  // Incident data
  let incident = $state<{
    id: number;
    title: string;
    start_date_time: number;
    status: string;
    state: string;
  }>({
    id: 0,
    title: "",
    start_date_time: Math.floor(Date.now() / 1000),
    status: "OPEN",
    state: GC.INVESTIGATING
  });

  // For datetime inputs (convert to/from local datetime string)
  let startDateTimeLocal = $state("");

  // First comment for new incidents
  let firstComment = $state("");

  // Comments for existing incidents
  let comments = $state<IncidentCommentRecord[]>([]);
  let loadingComments = $state(false);

  // Monitors
  let availableMonitors = $state<MonitorRecord[]>([]);
  let incidentMonitors = $state<Array<{ monitor_tag: string; monitor_impact: string | null }>>([]);
  let originalMonitors = $state<Array<{ monitor_tag: string; monitor_impact: string | null }>>([]);
  let addMonitorDialogOpen = $state(false);
  let selectedMonitorTag = $state("");
  let selectedMonitorImpact = $state("DOWN");
  let addingMonitor = $state(false);

  // Comment inline editing/adding
  let addingNewComment = $state(false);
  let editingCommentId = $state<number | null>(null);
  let commentText = $state<string>("");
  let commentState = $state<string>(GC.INVESTIGATING);
  let commentDateTime = $state<string>("");
  let savingComment = $state<boolean>(false);

  const states = [GC.INVESTIGATING, GC.IDENTIFIED, GC.MONITORING, GC.RESOLVED];

  // Convert timestamp to local datetime string for input (YYYY-MM-DDTHH:MM format)
  function timestampToLocalDatetime(ts: number): string {
    const date = new Date(ts * 1000);
    // Format as YYYY-MM-DDTHH:MM in local time
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  // Convert local datetime string to timestamp (stores as UTC)
  function localDatetimeToTimestamp(datetime: string): number {
    if (!datetime) return Math.floor(Date.now() / 1000);
    const date = new Date(datetime);
    return Math.floor(date.getTime() / 1000);
  }

  // Sync datetime inputs with incident state
  $effect(() => {
    if (incident.start_date_time) {
      startDateTimeLocal = timestampToLocalDatetime(incident.start_date_time);
    }
  });

  // Update incident timestamps when inputs change
  function handleStartDateChange(e: Event) {
    const target = e.target as HTMLInputElement;
    startDateTimeLocal = target.value;
    incident.start_date_time = localDatetimeToTimestamp(target.value);
  }

  // Validation
  const isValid = $derived(incident.title.trim() !== "" && incident.start_date_time > 0);

  // Fetch incident data
  async function fetchIncident() {
    if (isNew) {
      loading = false;
      return;
    }

    loading = true;
    error = null;
    try {
      const response = await fetch(clientResolver(resolve, "/manage/api"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "getIncident", data: { incident_id: parseInt(params.incident_id) } })
      });
      const result = await response.json();
      if (result.error) {
        error = result.error;
      } else if (result) {
        incident = {
          id: result.id,
          title: result.title,
          start_date_time: result.start_date_time,
          status: result.status,
          state: result.state
        };
        // Fetch comments and monitors
        await Promise.all([fetchComments(), fetchIncidentMonitors()]);
      } else {
        error = "Incident not found";
      }
    } catch (e) {
      error = e instanceof Error ? e.message : "Failed to fetch incident";
    } finally {
      loading = false;
    }
  }

  // Fetch comments
  async function fetchComments() {
    if (isNew) return;
    loadingComments = true;
    try {
      const response = await fetch(clientResolver(resolve, "/manage/api"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "getComments", data: { incident_id: parseInt(params.incident_id) } })
      });
      const result = await response.json();
      if (!result.error) {
        comments = result;
      }
    } catch {
      // Ignore errors
    } finally {
      loadingComments = false;
    }
  }

  // Fetch incident monitors
  async function fetchIncidentMonitors() {
    if (isNew) return;
    try {
      // We get monitors from the getIncident response - need to fetch full incident data
      const response = await fetch(clientResolver(resolve, "/manage/api"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "getIncidents",
          data: { page: 1, limit: 100, filter: { status: "ALL" } }
        })
      });
      const result = await response.json();
      if (!result.error && result.incidents) {
        const found = result.incidents.find((i: any) => i.id === parseInt(params.incident_id));
        if (found && found.monitors) {
          incidentMonitors = found.monitors.map((m: any) => ({
            monitor_tag: m.tag || m.monitor_tag,
            monitor_impact: m.impact_type || m.monitor_impact
          }));
          // Store original monitors to compare on save
          originalMonitors = [...incidentMonitors];
        }
      }
    } catch {
      // Ignore errors
    }
  }

  // Fetch available monitors
  async function fetchAvailableMonitors() {
    try {
      const response = await fetch(clientResolver(resolve, "/manage/api"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "getMonitors", data: { status: "ACTIVE" } })
      });
      const result = await response.json();
      if (!result.error) {
        availableMonitors = result;
      }
    } catch {
      // Ignore errors
    }
  }

  // Save incident (create or update)
  async function saveIncident() {
    if (!isValid) return;
    saving = true;
    error = null;

    try {
      if (isNew) {
        // Create new incident
        const response = await fetch(clientResolver(resolve, "/manage/api"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "createIncident",
            data: {
              title: incident.title,
              start_date_time: incident.start_date_time,
              end_date_time: null,
              status: "OPEN",
              state: GC.INVESTIGATING,
              incident_type: GC.INCIDENT
            }
          })
        });
        const result = await response.json();
        if (result.error) {
          toast.error(result.error);
        } else {
          const incidentId = result.incident_id;

          // Add monitors
          for (const monitor of incidentMonitors) {
            await fetch(clientResolver(resolve, "/manage/api"), {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "addMonitor",
                data: {
                  incident_id: incidentId,
                  monitor_tag: monitor.monitor_tag,
                  monitor_impact: monitor.monitor_impact
                }
              })
            });
          }

          // Add first comment if provided
          if (firstComment.trim()) {
            await fetch(clientResolver(resolve, "/manage/api"), {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "addComment",
                data: {
                  incident_id: incidentId,
                  comment: firstComment,
                  state: GC.INVESTIGATING,
                  commented_at: incident.start_date_time
                }
              })
            });
          }
          toast.success("Incident created successfully");
          goto(clientResolver(resolve, `/manage/app/incidents/${incidentId}`));
        }
      } else {
        // Update existing incident
        const response = await fetch(clientResolver(resolve, "/manage/api"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "updateIncident",
            data: {
              id: incident.id,
              title: incident.title,
              start_date_time: incident.start_date_time,
              end_date_time: null,
              status: "OPEN"
            }
          })
        });
        const result = await response.json();
        if (result.error) {
          toast.error(result.error);
        } else {
          // Sync monitors - find added, removed, and changed
          const originalTags = originalMonitors.map((m) => m.monitor_tag);
          const currentTags = incidentMonitors.map((m) => m.monitor_tag);

          // Monitors to add (in current but not in original)
          const toAdd = incidentMonitors.filter((m) => !originalTags.includes(m.monitor_tag));
          // Monitors to remove (in original but not in current)
          const toRemove = originalMonitors.filter((m) => !currentTags.includes(m.monitor_tag));
          // Monitors with changed impact (in both but impact is different)
          const toUpdate = incidentMonitors.filter((m) => {
            const original = originalMonitors.find((o) => o.monitor_tag === m.monitor_tag);
            return original && original.monitor_impact !== m.monitor_impact;
          });

          // Add new monitors
          for (const monitor of toAdd) {
            await fetch(clientResolver(resolve, "/manage/api"), {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "addMonitor",
                data: {
                  incident_id: incident.id,
                  monitor_tag: monitor.monitor_tag,
                  monitor_impact: monitor.monitor_impact
                }
              })
            });
          }

          // Update monitors with changed impact
          for (const monitor of toUpdate) {
            await fetch(clientResolver(resolve, "/manage/api"), {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "addMonitor",
                data: {
                  incident_id: incident.id,
                  monitor_tag: monitor.monitor_tag,
                  monitor_impact: monitor.monitor_impact
                }
              })
            });
          }

          // Remove deleted monitors
          for (const monitor of toRemove) {
            await fetch(clientResolver(resolve, "/manage/api"), {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "removeMonitor",
                data: {
                  incident_id: incident.id,
                  monitor_tag: monitor.monitor_tag
                }
              })
            });
          }

          // Update originalMonitors to reflect current state
          originalMonitors = [...incidentMonitors];

          toast.success("Changes saved successfully");
        }
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      saving = false;
    }
  }

  // Add monitor to incident
  async function addMonitorToIncident() {
    if (!selectedMonitorTag || !incident.id) return;
    addingMonitor = true;
    try {
      const response = await fetch(clientResolver(resolve, "/manage/api"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "addMonitor",
          data: {
            incident_id: incident.id,
            monitor_tag: selectedMonitorTag,
            monitor_impact: selectedMonitorImpact
          }
        })
      });
      const result = await response.json();
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Monitor added to incident");
        await fetchIncidentMonitors();
        addMonitorDialogOpen = false;
        selectedMonitorTag = "";
        selectedMonitorImpact = "DOWN";
      }
    } catch (e) {
      toast.error("Failed to add monitor");
    } finally {
      addingMonitor = false;
    }
  }

  // Remove monitor from incident
  async function removeMonitorFromIncident(monitorTag: string) {
    try {
      const response = await fetch(clientResolver(resolve, "/manage/api"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "removeMonitor",
          data: {
            incident_id: incident.id,
            monitor_tag: monitorTag
          }
        })
      });
      const result = await response.json();
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Monitor removed from incident");
        await fetchIncidentMonitors();
      }
    } catch {
      toast.error("Failed to remove monitor");
    }
  }

  // Start editing a comment (inline)
  function startEditComment(comment: IncidentCommentRecord) {
    editingCommentId = comment.id;
    commentText = comment.comment;
    commentState = comment.state;
    commentDateTime = timestampToLocalDatetime(comment.commented_at);
  }

  // Cancel editing
  function cancelEditComment() {
    editingCommentId = null;
    commentText = "";
    commentState = incident.state;
    commentDateTime = "";
  }

  // Start adding new comment (inline)
  function startAddComment() {
    addingNewComment = true;
    editingCommentId = null;
    commentText = "";
    commentState = incident.state;
    commentDateTime = timestampToLocalDatetime(Math.floor(Date.now() / 1000));
  }

  // Cancel adding new comment
  function cancelAddComment() {
    addingNewComment = false;
    commentText = "";
    commentState = incident.state;
    commentDateTime = "";
  }

  // Save comment (add or edit)
  async function saveComment() {
    if (!commentText.trim()) return;
    savingComment = true;
    try {
      if (editingCommentId !== null) {
        // Update existing comment
        const response = await fetch(clientResolver(resolve, "/manage/api"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "updateComment",
            data: {
              incident_id: incident.id,
              comment_id: editingCommentId,
              comment: commentText,
              state: commentState,
              commented_at: localDatetimeToTimestamp(commentDateTime)
            }
          })
        });
        const result = await response.json();
        if (result.error) {
          toast.error(result.error);
        } else {
          toast.success("Update saved");
          await fetchComments();
          await fetchIncident();
          cancelEditComment();
        }
      } else {
        // Add new comment
        const response = await fetch(clientResolver(resolve, "/manage/api"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "addComment",
            data: {
              incident_id: incident.id,
              comment: commentText,
              state: commentState,
              commented_at: localDatetimeToTimestamp(commentDateTime)
            }
          })
        });
        const result = await response.json();
        if (result.error) {
          toast.error(result.error);
        } else {
          toast.success("Update added");
          await fetchComments();
          await fetchIncident();
          cancelAddComment();
        }
      }
    } catch {
      toast.error("Failed to save update");
    } finally {
      savingComment = false;
    }
  }

  // Delete comment
  async function deleteComment(commentId: number) {
    try {
      const response = await fetch(clientResolver(resolve, "/manage/api"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "deleteComment",
          data: {
            incident_id: incident.id,
            comment_id: commentId
          }
        })
      });
      const result = await response.json();
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Update deleted");
        await fetchComments();
      }
    } catch {
      toast.error("Failed to delete update");
    }
  }

  // Add monitor to list (for new incidents, just adds to local array)
  function addMonitorToList() {
    if (!selectedMonitorTag) return;
    incidentMonitors = [
      ...incidentMonitors,
      { monitor_tag: selectedMonitorTag, monitor_impact: selectedMonitorImpact }
    ];
    addMonitorDialogOpen = false;
    selectedMonitorTag = "";
    selectedMonitorImpact = "DOWN";
  }

  // Remove monitor from list (for new incidents)
  function removeMonitorFromList(monitorTag: string) {
    incidentMonitors = incidentMonitors.filter((m) => m.monitor_tag !== monitorTag);
  }

  // Update monitor impact in list
  function updateMonitorImpact(monitorTag: string, newImpact: string) {
    incidentMonitors = incidentMonitors.map((m) =>
      m.monitor_tag === monitorTag ? { ...m, monitor_impact: newImpact } : m
    );
  }

  // Get state badge variant
  function getStateBadgeVariant(state: string): "default" | "secondary" | "destructive" | "outline" {
    switch (state) {
      case GC.RESOLVED:
        return "default";
      case GC.MONITORING:
        return "secondary";
      case GC.IDENTIFIED:
        return "outline";
      case GC.INVESTIGATING:
      default:
        return "destructive";
    }
  }

  // Get impact badge variant
  function getImpactBadgeVariant(impact: string | null): "default" | "secondary" | "destructive" | "outline" {
    switch (impact) {
      case "DOWN":
        return "destructive";
      case "DEGRADED":
        return "secondary";
      case "MAINTENANCE":
        return "outline";
      default:
        return "default";
    }
  }

  // Get monitor name by tag
  function getMonitorName(tag: string): string {
    const monitor = availableMonitors.find((m) => m.tag === tag);
    return monitor?.name || tag;
  }

  // Get unassigned monitors
  const unassignedMonitors = $derived(
    availableMonitors.filter((m) => !incidentMonitors.some((im) => im.monitor_tag === m.tag))
  );

  $effect(() => {
    fetchIncident();
    fetchAvailableMonitors();
  });
</script>

<div class="container space-y-6 py-6">
  <!-- Breadcrumb -->
  <Breadcrumb.Root>
    <Breadcrumb.List>
      <Breadcrumb.Item>
        <Breadcrumb.Link href={clientResolver(resolve, "/manage/app")}>Dashboard</Breadcrumb.Link>
      </Breadcrumb.Item>
      <Breadcrumb.Separator />
      <Breadcrumb.Item>
        <Breadcrumb.Link href={clientResolver(resolve, "/manage/app/incidents")}>Incidents</Breadcrumb.Link>
      </Breadcrumb.Item>
      <Breadcrumb.Separator />
      <Breadcrumb.Item>
        <Breadcrumb.Page>{isNew ? "New Incident" : `Edit Incident #${params.incident_id}`}</Breadcrumb.Page>
      </Breadcrumb.Item>
    </Breadcrumb.List>
  </Breadcrumb.Root>

  {#if loading}
    <div class="flex items-center justify-center py-12">
      <Spinner class="size-8" />
    </div>
  {:else if error}
    <Card.Root class="border-destructive">
      <Card.Content class="pt-6">
        <div class="flex items-center gap-2">
          <AlertTriangleIcon class="text-destructive size-5" />
          <p class="text-destructive">{error}</p>
        </div>
      </Card.Content>
    </Card.Root>
  {:else}
    <!-- Incident Details -->
    <Card.Root>
      <Card.Header>
        <Card.Title>{isNew ? "Create New Incident" : "Incident Details"}</Card.Title>
        <Card.Description>
          {#if isNew}
            Create a new incident to track
          {:else}
            Edit incident details and manage updates
          {/if}
        </Card.Description>
      </Card.Header>
      <Card.Content class="space-y-6">
        <!-- Status badges (only for existing) -->
        {#if !isNew}
          <div class="flex items-center gap-2">
            <Badge variant={getStateBadgeVariant(incident.state)}>{incident.state}</Badge>
            <Badge variant={incident.status === "OPEN" ? "default" : "outline"}>{incident.status}</Badge>
          </div>
        {/if}

        <!-- Title -->
        <div class="flex flex-col gap-2">
          <Label for="incident-title">Title <span class="text-destructive">*</span></Label>
          <Input id="incident-title" bind:value={incident.title} placeholder="Brief description of the incident" />
        </div>

        <!-- Start Date/Time -->
        <div class="flex flex-col gap-2">
          <Label for="incident-start">Start Date/Time <span class="text-destructive">*</span></Label>
          <Input
            id="incident-start"
            type="datetime-local"
            value={startDateTimeLocal}
            onchange={handleStartDateChange}
          />
          <p class="text-muted-foreground text-xs">Enter time in your local timezone. It will be stored as UTC.</p>
        </div>

        <!-- First Comment (only for new) -->
        {#if isNew}
          <div class="flex flex-col gap-2">
            <Label for="first-comment">Initial Update (Optional)</Label>
            <div class="overflow-hidden rounded-md border">
              <CodeMirror
                bind:value={firstComment}
                lang={markdown()}
                theme={mode.current === "dark" ? githubDark : githubLight}
                styles={{
                  "&": {
                    width: "100%",
                    maxWidth: "100%",
                    height: "160px"
                  }
                }}
              />
            </div>
            <p class="text-muted-foreground text-xs">
              Supports Markdown. This will be added as the first update for this incident.
            </p>
          </div>
        {/if}

        <!-- Affected Monitors (for both new and existing incidents) -->
        <div class="flex flex-col gap-2">
          <div class="flex items-center justify-between">
            <Label>Affected Monitors (Optional)</Label>
            <Dialog.Root bind:open={addMonitorDialogOpen}>
              <Dialog.Trigger>
                {#snippet child({ props })}
                  <Button {...props} size="sm" variant="outline" disabled={unassignedMonitors.length === 0}>
                    <PlusIcon class="mr-2 size-4" />
                    Add Monitor
                  </Button>
                {/snippet}
              </Dialog.Trigger>
              <Dialog.Content>
                <Dialog.Header>
                  <Dialog.Title>Add Affected Monitor</Dialog.Title>
                  <Dialog.Description>Select a monitor and its impact level</Dialog.Description>
                </Dialog.Header>
                <div class="space-y-4 py-4">
                  <div class="flex flex-col gap-2">
                    <Label>Monitor</Label>
                    <Select.Root
                      type="single"
                      value={selectedMonitorTag}
                      onValueChange={(v) => {
                        if (v) selectedMonitorTag = v;
                      }}
                    >
                      <Select.Trigger class="w-full">
                        {selectedMonitorTag ? getMonitorName(selectedMonitorTag) : "Select a monitor"}
                      </Select.Trigger>
                      <Select.Content>
                        {#each unassignedMonitors as monitor}
                          <Select.Item value={monitor.tag}>{monitor.name}</Select.Item>
                        {/each}
                      </Select.Content>
                    </Select.Root>
                  </div>
                  <div class="flex flex-col gap-2">
                    <Label>Impact Level</Label>
                    <Select.Root
                      type="single"
                      value={selectedMonitorImpact}
                      onValueChange={(v) => {
                        if (v) selectedMonitorImpact = v;
                      }}
                    >
                      <Select.Trigger class="w-full">
                        {selectedMonitorImpact}
                      </Select.Trigger>
                      <Select.Content>
                        <Select.Item value="DOWN">Down</Select.Item>
                        <Select.Item value="DEGRADED">Degraded</Select.Item>
                      </Select.Content>
                    </Select.Root>
                  </div>
                </div>
                <Dialog.Footer>
                  <Button variant="outline" onclick={() => (addMonitorDialogOpen = false)}>Cancel</Button>
                  <Button onclick={addMonitorToList} disabled={!selectedMonitorTag}>Add Monitor</Button>
                </Dialog.Footer>
              </Dialog.Content>
            </Dialog.Root>
          </div>
          {#if incidentMonitors.length === 0}
            <p class="text-muted-foreground text-sm">No monitors selected</p>
          {:else}
            <div class="space-y-2">
              {#each incidentMonitors as monitor}
                <div class="flex items-center justify-between rounded-md border p-3">
                  <div class="flex items-center gap-3">
                    <span class="font-medium">{getMonitorName(monitor.monitor_tag)}</span>
                    <Badge variant={getImpactBadgeVariant(monitor.monitor_impact)}>
                      {monitor.monitor_impact || "Unknown"}
                    </Badge>
                  </div>
                  <DropdownMenu.Root>
                    <DropdownMenu.Trigger>
                      {#snippet child({ props })}
                        <Button {...props} variant="ghost" size="icon">
                          <MoreVerticalIcon class="size-4" />
                        </Button>
                      {/snippet}
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Content align="end">
                      <DropdownMenu.Label>Update Impact</DropdownMenu.Label>
                      <DropdownMenu.Group>
                        <DropdownMenu.Item
                          class="cursor-pointer"
                          onclick={() => updateMonitorImpact(monitor.monitor_tag, "DOWN")}
                        >
                          <span class="flex items-center gap-2">
                            {#if monitor.monitor_impact === "DOWN"}
                              <CheckIcon class="size-4" />
                            {:else}
                              <span class="size-4"></span>
                            {/if}
                            Down
                          </span>
                        </DropdownMenu.Item>
                        <DropdownMenu.Item
                          class="cursor-pointer"
                          onclick={() => updateMonitorImpact(monitor.monitor_tag, "DEGRADED")}
                        >
                          <span class="flex items-center gap-2">
                            {#if monitor.monitor_impact === "DEGRADED"}
                              <CheckIcon class="size-4" />
                            {:else}
                              <span class="size-4"></span>
                            {/if}
                            Degraded
                          </span>
                        </DropdownMenu.Item>
                      </DropdownMenu.Group>
                      <DropdownMenu.Separator />
                      <DropdownMenu.Item
                        class="text-destructive cursor-pointer"
                        onclick={() => removeMonitorFromList(monitor.monitor_tag)}
                      >
                        <TrashIcon class="mr-2 size-4" />
                        Remove
                      </DropdownMenu.Item>
                    </DropdownMenu.Content>
                  </DropdownMenu.Root>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      </Card.Content>
      <Card.Footer class="flex justify-end">
        <Button onclick={saveIncident} disabled={saving || !isValid}>
          {#if saving}
            <Loader class="mr-2 size-4 animate-spin" />
          {:else}
            <SaveIcon class="mr-2 size-4" />
          {/if}
          {isNew ? "Create Incident" : "Save Changes"}
        </Button>
      </Card.Footer>
    </Card.Root>

    <!-- Updates/Comments (only for existing incidents) -->
    {#if !isNew}
      <Card.Root>
        <Card.Header>
          <div class="flex items-center justify-between">
            <div>
              <Card.Title>Updates</Card.Title>
              <Card.Description>Timeline of status updates for this incident</Card.Description>
            </div>
            {#if !addingNewComment}
              <Button size="sm" onclick={startAddComment}>
                <PlusIcon class="mr-2 size-4" />
                Add Update
              </Button>
            {/if}
          </div>
        </Card.Header>
        <Card.Content>
          <!-- Add new comment inline form -->
          {#if addingNewComment}
            <div class="mb-4 space-y-4 rounded-md border p-4">
              <div class="flex flex-col gap-2">
                <Label>Update Message</Label>
                <div class="overflow-hidden rounded-md border">
                  <CodeMirror
                    bind:value={commentText}
                    lang={markdown()}
                    theme={mode.current === "dark" ? githubDark : githubLight}
                    styles={{
                      "&": {
                        width: "100%",
                        maxWidth: "100%",
                        height: "120px"
                      }
                    }}
                  />
                </div>
                <p class="text-muted-foreground text-xs">Supports Markdown formatting</p>
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div class="flex flex-col gap-2">
                  <Label>State</Label>
                  <Select.Root
                    type="single"
                    value={commentState}
                    onValueChange={(v) => {
                      if (v) commentState = v;
                    }}
                  >
                    <Select.Trigger class="w-full">{commentState}</Select.Trigger>
                    <Select.Content>
                      {#each states as state}
                        <Select.Item value={state}>{state}</Select.Item>
                      {/each}
                    </Select.Content>
                  </Select.Root>
                </div>
                <div class="flex flex-col gap-2">
                  <Label>Date/Time</Label>
                  <Input type="datetime-local" bind:value={commentDateTime} />
                </div>
              </div>
              <div class="flex justify-end gap-2">
                <Button variant="outline" size="sm" onclick={cancelAddComment}>Cancel</Button>
                <Button size="sm" onclick={saveComment} disabled={!commentText.trim() || savingComment}>
                  {#if savingComment}
                    <Loader class="mr-2 size-4 animate-spin" />
                  {/if}
                  Add Update
                </Button>
              </div>
            </div>
          {/if}

          {#if loadingComments}
            <div class="flex justify-center py-4">
              <Spinner class="size-6" />
            </div>
          {:else if comments.length === 0 && !addingNewComment}
            <p class="text-muted-foreground py-4 text-center text-sm">No updates yet</p>
          {:else}
            <div class="space-y-4">
              {#each comments as comment (comment.id)}
                <div class="rounded-md border p-4">
                  {#if editingCommentId === comment.id}
                    <!-- Inline edit mode -->
                    <div class="space-y-4">
                      <div class="flex flex-col gap-2">
                        <Label>Update Message</Label>
                        <div class="overflow-hidden rounded-md border">
                          <CodeMirror
                            bind:value={commentText}
                            lang={markdown()}
                            theme={mode.current === "dark" ? githubDark : githubLight}
                            styles={{
                              "&": {
                                width: "100%",
                                maxWidth: "100%",
                                height: "120px"
                              }
                            }}
                          />
                        </div>
                        <p class="text-muted-foreground text-xs">Supports Markdown formatting</p>
                      </div>
                      <div class="grid grid-cols-2 gap-4">
                        <div class="flex flex-col gap-2">
                          <Label>State</Label>
                          <Select.Root
                            type="single"
                            value={commentState}
                            onValueChange={(v) => {
                              if (v) commentState = v;
                            }}
                          >
                            <Select.Trigger class="w-full">{commentState}</Select.Trigger>
                            <Select.Content>
                              {#each states as state}
                                <Select.Item value={state}>{state}</Select.Item>
                              {/each}
                            </Select.Content>
                          </Select.Root>
                        </div>
                        <div class="flex flex-col gap-2">
                          <Label>Date/Time</Label>
                          <Input type="datetime-local" bind:value={commentDateTime} />
                        </div>
                      </div>
                      <div class="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onclick={cancelEditComment}>Cancel</Button>
                        <Button size="sm" onclick={saveComment} disabled={!commentText.trim() || savingComment}>
                          {#if savingComment}
                            <Loader class="mr-2 size-4 animate-spin" />
                          {/if}
                          Save
                        </Button>
                      </div>
                    </div>
                  {:else}
                    <!-- View mode -->
                    <div class="flex items-start justify-between">
                      <div class="flex-1 space-y-2">
                        <div class="flex items-center gap-2">
                          <Badge variant={getStateBadgeVariant(comment.state)}>{comment.state}</Badge>
                          <span class="text-muted-foreground text-sm">
                            {format(new Date(comment.commented_at * 1000), "MMM d, yyyy HH:mm")}
                          </span>
                        </div>
                        <div
                          class="kener-md prose prose-neutral dark:prose-invert prose-code:rounded prose-code:py-[0.2rem] prose-code:font-mono prose-code:text-sm prose-code:font-normal prose-pre:bg-opacity-0 dark:prose-pre:bg-neutral-800 max-w-none"
                        >
                          {@html mdToHTML(comment.comment)}
                        </div>
                      </div>
                      <div class="ml-4 flex gap-1">
                        <Button variant="ghost" size="icon" onclick={() => startEditComment(comment)}>
                          <PencilIcon class="size-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onclick={() => deleteComment(comment.id)}>
                          <TrashIcon class="size-4" />
                        </Button>
                      </div>
                    </div>
                  {/if}
                </div>
              {/each}
            </div>
          {/if}
        </Card.Content>
      </Card.Root>
    {/if}
  {/if}
</div>
