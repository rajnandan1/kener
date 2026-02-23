<script lang="ts">
  const boxes = Array.from({ length: 24 * 60 }, (_, i) => i);
</script>

<!-- Loop 1440 times (24 hours * 60 minutes) -->
{#each boxes as k (k)}
  <div class="today-sq animatebg m-px h-2.5 w-2.5" style="animation-delay:{Math.random() * (k * 15)}ms;"></div>
{/each}
