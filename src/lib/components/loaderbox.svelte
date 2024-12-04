<script>
	let i = 24 * 60;
</script>

<!-- Loop i times -->
{#each Array.from({ length: i }, (ii, i) => i) as k}
	<div
		class="today-sq animatebg m-[1px] h-[10px] w-[10px]"
		style="animation-delay:{Math.random(0, 1) * (k * 15)}ms;"
	></div>
{/each}
