<script lang="ts" module>
  export type { CodeMirrorProps } from "svelte-codemirror-editor";
</script>

<script lang="ts">
  import { onMount } from "svelte";
  import VendorCodeMirror, { type CodeMirrorProps } from "svelte-codemirror-editor";
  import { getAdminI18n } from "$lib/admin-i18n/context";

  const { t: adminT } = getAdminI18n();
  let { value = $bindable(""), ...editorProps }: CodeMirrorProps = $props();
  let mounted = $state(false);

  onMount(() => {
    mounted = true;
  });
</script>

{#if mounted}
  <VendorCodeMirror bind:value {...editorProps} />
{:else}
  <div class={editorProps.class} data-slot="code-editor-fallback">
    <p role="status">{$adminT("Loading editor...")}</p>
    <pre class="overflow-auto font-mono text-sm whitespace-pre-wrap">{value ?? ""}</pre>
  </div>
{/if}
