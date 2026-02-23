<script lang="ts">
  import { page } from "$app/state";

  let { data } = page;
</script>

<div class="mx-auto flex max-w-5xl justify-center px-4">
  {@html data.footerHTML}
</div>
