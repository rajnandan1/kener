<script lang="ts">
  import type { PageMonitorLayoutStyle } from "$lib/types/api";
  import { GetGridContainerClass, GetGridItemSpanClass, IsCompactLayout, IsGridLayout } from "$lib/monitorLayout";

  // A sketch of how a group's members are laid out on the status page, with the same grid classes,
  // so the group editor can show a layout the moment it is picked.
  interface Props {
    members: Array<{ tag: string; name: string }>;
    layoutStyle: PageMonitorLayoutStyle;
  }

  let { members, layoutStyle }: Props = $props();
  let isGrid = $derived(IsGridLayout(layoutStyle));
  let isCompact = $derived(IsCompactLayout(layoutStyle));
</script>

{#if members.length === 0}
  <p class="text-muted-foreground rounded-xl border border-dashed px-3 py-6 text-center text-xs">
    Add monitors to the group to preview the layout
  </p>
{:else}
  <div
    class="grid grid-cols-1 overflow-hidden rounded-xl border {GetGridContainerClass(layoutStyle)}"
    data-layout={layoutStyle}
    aria-label="Layout preview"
    role="img"
  >
    {#each members as member, i (member.tag)}
      <div
        class={isGrid
          ? `${GetGridItemSpanClass(i, members.length, layoutStyle)} bg-background`
          : `bg-background ${i < members.length - 1 ? "border-b" : ""}`}
        data-testid="layout-preview-item"
      >
        <div class="flex items-center gap-2 px-3 py-2">
          {#if !isCompact}
            <div class="bg-muted size-5 shrink-0 rounded-full"></div>
          {/if}
          <span class="min-w-0 flex-1 truncate text-xs font-medium">{member.name}</span>
          <span class="bg-up size-2 shrink-0 rounded-full"></span>
        </div>
        {#if !isCompact}
          <div class="flex gap-px px-3 pb-2" data-testid="layout-preview-bar">
            {#each Array(isGrid ? 18 : 36) as _, j (j)}
              <div class="bg-up/70 h-3 flex-1 rounded-[2px]"></div>
            {/each}
          </div>
        {/if}
      </div>
    {/each}
  </div>
{/if}
