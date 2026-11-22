<script lang="ts">
  import { untrack } from "svelte";
  import { createAdminI18n } from "$lib/admin-i18n/context";
  import type { AdminLocale } from "$lib/admin-i18n/messages";
  import CodeEditor, { type CodeMirrorProps } from "./CodeEditor.svelte";

  let {
    initialLocale = "pl",
    initialValue = "",
    ...editorProps
  }: CodeMirrorProps & { initialLocale?: AdminLocale; initialValue?: string } = $props();
  createAdminI18n(untrack(() => initialLocale));
  let value = $state(untrack(() => initialValue));
</script>

<CodeEditor bind:value {...editorProps} />
<output data-testid="bound-editor-value">{value}</output>
<button type="button" onclick={() => (value = "Updated by parent")}>Set parent value</button>
