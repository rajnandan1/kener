<script lang="ts">
  import { tc } from "$lib/stores/i18n";
  import { page } from "$app/state";

  let { data } = page;
</script>

<div class="mx-auto flex max-w-5xl justify-center px-4">
  {@html $tc(data.footerHTML)}
</div>
