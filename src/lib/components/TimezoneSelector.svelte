<script lang="ts">
  import * as Command from "$lib/components/ui/command/index.js";
  import * as Popover from "$lib/components/ui/popover/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import { timezone, selectedTimezone } from "$lib/stores/timezone";
  import Globe from "@lucide/svelte/icons/globe";
  import CheckIcon from "@lucide/svelte/icons/check";
  import { tick } from "svelte";
  import { cn } from "$lib/utils.js";
  import trackEvent from "$lib/beacon";

  let open = $state(false);
  let triggerRef = $state<HTMLButtonElement>(null!);

  // Handle timezone change
  function handleTimezoneSelect(tz: string) {
    if (tz && tz !== $selectedTimezone) {
      timezone.setTimezone(tz);
      trackEvent("timezone_changed", { timezone: tz });
    }
    closeAndFocusTrigger();
  }

  // Refocus the trigger button when the user selects an item
  function closeAndFocusTrigger() {
    open = false;
    tick().then(() => {
      triggerRef?.focus();
    });
  }
</script>

<Popover.Root bind:open>
  <Popover.Trigger bind:ref={triggerRef}>
    {#snippet child({ props })}
      <Button
        {...props}
        variant="outline"
        size="sm"
        class="ksel bg-background/80 dark:bg-background/70 border-foreground/10 rounded-full border text-xs font-medium shadow-none backdrop-blur-md"
        role="combobox"
        aria-expanded={open}
      >
        <Globe class="text-inherit" />
        {$selectedTimezone}
      </Button>
    {/snippet}
  </Popover.Trigger>
  <Popover.Content class="w-[280px] p-0">
    <Command.Root>
      <Command.Input placeholder="Search timezone..." />
      <Command.List class="max-h-60">
        <Command.Empty>No timezone found.</Command.Empty>
        <Command.Group>
          {#each $timezone.availableTimezones as tz (tz)}
            <Command.Item value={tz} onSelect={() => handleTimezoneSelect(tz)} class="text-xs">
              <CheckIcon class={cn("me-2 size-4", $selectedTimezone !== tz && "text-transparent")} />
              {tz}
            </Command.Item>
          {/each}
        </Command.Group>
      </Command.List>
    </Command.Root>
  </Popover.Content>
</Popover.Root>
