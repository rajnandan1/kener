<script>
	import Monitor from "$lib/components/monitor.svelte"; 
	
	export let data;
</script>
{#if data.site.hero}
<section class="mx-auto flex w-full max-w-4xl flex-1 flex-col items-start justify-center">
    <div class="mx-auto max-w-screen-xl px-4 pt-32 pb-16 lg:flex lg:items-center">
        <div class="mx-auto max-w-3xl text-center blurry-bg">
			{#if data.site.hero.image}
			<img src="{data.site.hero.image}" class="h-16 w-16 m-auto" alt="" srcset="">
			{/if}
			{#if data.site.hero.title}
            <h1 class="bg-gradient-to-r from-green-300 via-blue-500 to-purple-600 bg-clip-text text-5xl font-extrabold text-transparent leading-snug">
				{data.site.hero.title}
			</h1>
			{/if}
			{#if data.site.hero.subtitle}
            <p class="mx-auto mt-4 max-w-xl sm:text-xl">{data.site.hero.subtitle}</p>
			{/if}
        </div>
    </div>
</section>
{/if}

{#each data.monitors as monitor}
	<Monitor {monitor}   />
{/each}