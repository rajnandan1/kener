<script lang="ts">
  import { Checkbox } from "$lib/components/ui/checkbox/index.js";
  import { Label } from "$lib/components/ui/label/index.js";
  import type { AccessGroupRecord } from "$lib/server/types/db.js";

  interface Props {
    groups: AccessGroupRecord[];
    selected: string[];
    disabled?: boolean;
    // Prefix for the checkbox ids, so two lists on one page do not clash
    idPrefix: string;
  }

  let { groups, selected = $bindable(), disabled = false, idPrefix }: Props = $props();

  function setChecked(groupId: string, checked: boolean) {
    selected = checked ? [...new Set([...selected, groupId])] : selected.filter((id) => id !== groupId);
  }
</script>

<!-- A real checkbox with its own label, so keyboard and screen readers get one control per group -->
<ul class="flex flex-col gap-2">
  {#each groups as group (group.id)}
    {@const inputId = `${idPrefix}-${group.id}`}
    {@const isChecked = selected.includes(group.id)}
    <li
      class="flex items-start gap-3 rounded-md border p-3 {isChecked ? 'border-primary bg-primary/5' : ''} {disabled
        ? 'opacity-70'
        : ''}"
    >
      <Checkbox
        id={inputId}
        class="mt-0.5"
        checked={isChecked}
        {disabled}
        onCheckedChange={(checked) => setChecked(group.id, checked === true)}
      />
      <div class="flex flex-col gap-0.5">
        <Label for={inputId} class="cursor-pointer text-sm font-medium">
          {group.group_name}
          <span class="text-muted-foreground font-mono text-xs font-normal">{group.id}</span>
        </Label>
        {#if group.description}
          <span class="text-muted-foreground text-xs">{group.description}</span>
        {/if}
      </div>
    </li>
  {/each}
</ul>
