<script>
    import {  Github } from "lucide-svelte";
    import { Button } from "$lib/components/ui/button";
	import { buttonVariants } from "$lib/components/ui/button";
	export let data;
</script>
<div class="one"></div>
<header class=" relative  z-50 w-full  ">
    <div class="container flex h-14 items-center">
        <div class="mr-4 flex blurry-bg ">
            <a href="{data.site.home}" class="mr-6 flex items-center space-x-2">
                <img src="{data.site.logo}" class="h-5 w-5" alt="" srcset="">
                <span class="hidden font-bold sm:inline-block text-[15px] lg:text-base">
					 {data.site.title}
					 </span>
            </a>
            <nav class="flex items-center space-x-6 text-sm font-medium">
				{#each data.site.nav as navItem}
                <a href="{navItem.url}"> {navItem.name} </a>
				{/each}
            </nav>
        </div>
		{#if data.site.github && data.site.github.visible}
        <div class="flex flex-1 items-center justify-between space-x-2 sm:space-x-4 md:justify-end">
            <div class="w-full flex-1 md:w-auto md:flex-none">
				<a href="https://github.com/{data.site.github.owner}/{data.site.github.repo}" class="{buttonVariants({ variant: "ghost" })} blurry-bg">
					<Github class="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all" />
				</a>
            </div>
        </div>
		{/if}
    </div>
</header>
