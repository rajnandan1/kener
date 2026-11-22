<script lang="ts">
  import KenerNav from "$lib/components/KenerNav.svelte";
  import LanguageSwitcher from "$lib/admin-i18n/LanguageSwitcher.svelte";
</script>

<header>
  <KenerNav fixed={false} localizeDefaultLinks />
  <div class="mx-auto flex max-w-5xl justify-end px-4 py-3"><LanguageSwitcher /></div>
</header>
