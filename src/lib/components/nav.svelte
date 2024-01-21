<script>
    import { Button } from "$lib/components/ui/button";
    import { buttonVariants } from "$lib/components/ui/button";
    export let data;
</script>
<div class="one"></div>

<header class="relative z-50 w-full">
    <div class="container flex h-14 items-center ">
        <div class="mr-4 flex blurry-bg w-full justify-between">
            <a href="{data.site.home ? data.site.home:'/'}" class="mr-6 flex items-center space-x-2">
                {#if data.site.logo}
				<img src="{data.site.logo}" class="h-8" alt="{data.site.title}" srcset="" />
				{/if}
				{#if data.site.title}
				<span class="hidden font-bold md:inline-block text-[15px] lg:text-base"> {data.site.title} </span>
				{/if}
            </a>
			{#if data.site.nav}
            <nav class="flex flex-wrap items-center space-x-6 text-sm font-medium">
                {#each data.site.nav as navItem}
                <a href="{navItem.url}"> {navItem.name} </a>
                {/each}
            </nav>
			{/if}
        </div>
    </div>
</header>