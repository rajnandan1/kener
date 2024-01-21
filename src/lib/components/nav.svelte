<script>
    import { Button } from "$lib/components/ui/button";
    import { buttonVariants } from "$lib/components/ui/button";
    import { Menu } from "lucide-svelte";
	import {onMount} from "svelte";
    import * as DropdownMenu from "$lib/components/ui/dropdown-menu";
    export let data;

    function toggleNav() {
        let nav = document.getElementById("navbar-default");
        nav.classList.toggle("hidden");
    }
	onMount(()=>{
		let nav = document.getElementById("navbar-default");
		nav.classList.add("hidden");

		document.addEventListener('click', function(event) {
			const myDiv = document.getElementById('navbar-default');
			const hamBtn = document.getElementById('ham-btn');
			if (!myDiv.classList.contains("hidden") && !myDiv.contains(event.target) && !hamBtn.contains(event.target)) {
				nav.classList.add("hidden"); // Or any other action to close the div
			}
		});
	})
	 
</script>
<div class="one"></div>

<nav class="relative z-50 h-14">
    <div class="max-w-screen-xl flex flex-wrap items-center justify-between mx-auto p-4">
        <a href="{data.site.home ? data.site.home:'/'}" class="flex items-center space-x-3 blurry-bg">
            {#if data.site.logo}
            <img src="{data.site.logo}" class="h-8" alt="{data.site.title}" srcset="" />
            {/if} {#if data.site.title}
            <span class="self-center font-semibold whitespace-nowrap">{data.site.title}</span>
            {/if}
        </a>

        <Button on:click="{toggleNav}" variant="outline" size="icon" class="inline-flex items-center p-2 w-10 h-10 justify-center text-sm rounded-lg md:hidden focus:outline-none" id="ham-btn">
            <Menu className="h-4 w-4" />
        </Button>
        <div class="hidden w-full md:block md:w-auto" id="navbar-default">
            <ul
                class="font-medium md:relative md:bg-transparent absolute w-full left-[0px] flex flex-col p-1 md:p-0 mt-4 border-solid border border-secondary bg-card text-card-foreground   md:flex-row md:space-x-1 md:mt-0 md:border-0"
            >
                {#each data.site.nav as navItem}
                <li>
                    <a href="{navItem.url}" rel="external">
						<Button   variant="link">{navItem.name}</Button>
					</a>
                </li>

                {/each}
                <li>
                    <DropdownMenu.Root>
                        <DropdownMenu.Trigger asChild let:builder>
							<Button builders={[builder]} variant="link">Categories</Button>
                        </DropdownMenu.Trigger>
                        <DropdownMenu.Content class="w-56">
                            <DropdownMenu.Group>
								<a rel="external" href="/">
                                	<DropdownMenu.Item class="font-medium">Home</DropdownMenu.Item>
								</a>
							</DropdownMenu.Group>
                            <DropdownMenu.Group>
								{#if data.site.categories}
								{#each data.site.categories as category}
								<a rel="external" href="/category-{category.name}">
									<DropdownMenu.Item class="font-medium">{category.name}</DropdownMenu.Item>
								</a>
								{/each}
								{/if}
							</DropdownMenu.Group>
                        </DropdownMenu.Content>
                    </DropdownMenu.Root>
                </li>
            </ul>
        </div>
    </div>
</nav>
