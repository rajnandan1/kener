<script lang="ts">
  import { getAdminI18n } from "$lib/admin-i18n/context";
  const { t: adminT } = getAdminI18n();

  import { cn } from "$lib/utils.js";
  import Loader2Icon from "@lucide/svelte/icons/loader-2";
  import type { ComponentProps } from "svelte";

  let { class: className, ...restProps }: ComponentProps<typeof Loader2Icon> = $props();
</script>

<Loader2Icon role="status" aria-label={$adminT("Loading")} class={cn("size-4 animate-spin", className)} {...restProps} />
