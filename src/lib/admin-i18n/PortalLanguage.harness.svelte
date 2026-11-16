<script lang="ts">
  import { untrack } from "svelte";
  import { createAdminI18n, getAdminI18n, type AdminI18nContext } from "./context";
  import type { AdminLocale } from "./messages";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import * as Sheet from "$lib/components/ui/sheet/index.js";
  import * as AlertDialog from "$lib/components/ui/alert-dialog/index.js";
  import * as Tooltip from "$lib/components/ui/tooltip/index.js";
  import * as Popover from "$lib/components/ui/popover/index.js";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
  import * as Select from "$lib/components/ui/select/index.js";
  import * as HoverCard from "$lib/components/ui/hover-card/index.js";

  let {
    kind = "dialog",
    initialLocale = "pl",
    admin = true,
    explicitLang,
    onContext
  }: {
    kind?:
      | "dialog"
      | "sheet"
      | "alert-dialog"
      | "tooltip"
      | "popover"
      | "dropdown-menu"
      | "dropdown-menu-sub"
      | "select"
      | "hover-card";
    initialLocale?: AdminLocale;
    admin?: boolean;
    explicitLang?: string;
    onContext?: (context: AdminI18nContext) => void;
  } = $props();
  const context = untrack(() => admin) ? createAdminI18n(untrack(() => initialLocale)) : getAdminI18n();
  const { locale, t: adminT } = context;
  untrack(() => onContext?.(context));
  const contentProps = $derived(explicitLang === undefined ? {} : { lang: explicitLang });
</script>

<main data-testid="main-boundary" lang={admin ? $locale : "fr"}>
  {#if kind === "dialog"}
    <Dialog.Root open={true}>
      <Dialog.Trigger>Open</Dialog.Trigger>
      <Dialog.Content data-testid="portal-content" {...contentProps}>
        <Dialog.Title>{$adminT("Save")}</Dialog.Title>
        <Dialog.Description>Example</Dialog.Description>
      </Dialog.Content>
    </Dialog.Root>
  {:else if kind === "sheet"}
    <Sheet.Root open={true}>
      <Sheet.Trigger>Open</Sheet.Trigger>
      <Sheet.Content data-testid="portal-content" {...contentProps}>
        <Sheet.Title>{$adminT("Save")}</Sheet.Title>
        <Sheet.Description>Example</Sheet.Description>
      </Sheet.Content>
    </Sheet.Root>
  {:else if kind === "alert-dialog"}
    <AlertDialog.Root open={true}>
      <AlertDialog.Trigger>Open</AlertDialog.Trigger>
      <AlertDialog.Content data-testid="portal-content" {...contentProps}>
        <AlertDialog.Title>{$adminT("Save")}</AlertDialog.Title>
        <AlertDialog.Description>Example</AlertDialog.Description>
        <AlertDialog.Cancel>Close</AlertDialog.Cancel>
      </AlertDialog.Content>
    </AlertDialog.Root>
  {:else if kind === "tooltip"}
    <Tooltip.Provider>
      <Tooltip.Root open={true}>
        <Tooltip.Trigger>Open</Tooltip.Trigger>
        <Tooltip.Content data-testid="portal-content" {...contentProps}>{$adminT("Save")}</Tooltip.Content>
      </Tooltip.Root>
    </Tooltip.Provider>
  {:else if kind === "popover"}
    <Popover.Root open={true}>
      <Popover.Trigger>Open</Popover.Trigger>
      <Popover.Content data-testid="portal-content" {...contentProps}>{$adminT("Save")}</Popover.Content>
    </Popover.Root>
  {:else if kind === "dropdown-menu" || kind === "dropdown-menu-sub"}
    <DropdownMenu.Root open={true}>
      <DropdownMenu.Trigger>Open</DropdownMenu.Trigger>
      <DropdownMenu.Content data-testid={kind === "dropdown-menu" ? "portal-content" : "parent-menu"} {...contentProps}>
        {#if kind === "dropdown-menu-sub"}
          <DropdownMenu.Sub open={true}>
            <DropdownMenu.SubTrigger>More</DropdownMenu.SubTrigger>
            <DropdownMenu.SubContent data-testid="portal-content" {...contentProps}>
              <DropdownMenu.Item>{$adminT("Save")}</DropdownMenu.Item>
            </DropdownMenu.SubContent>
          </DropdownMenu.Sub>
        {:else}
          <DropdownMenu.Item>{$adminT("Save")}</DropdownMenu.Item>
        {/if}
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  {:else if kind === "select"}
    <Select.Root type="single" open={true}>
      <Select.Trigger>Open</Select.Trigger>
      <Select.Content data-testid="portal-content" {...contentProps}>
        <Select.Item value="save">{$adminT("Save")}</Select.Item>
      </Select.Content>
    </Select.Root>
  {:else}
    <HoverCard.Root open={true}>
      <HoverCard.Trigger href="#example">Open</HoverCard.Trigger>
      <HoverCard.Content data-testid="portal-content" {...contentProps}>{$adminT("Save")}</HoverCard.Content>
    </HoverCard.Root>
  {/if}
</main>
