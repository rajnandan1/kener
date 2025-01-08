<script>
	import { Button } from "$lib/components/ui/button";
	import * as DropdownMenu from "$lib/components/ui/dropdown-menu";
	import { Languages, Menu } from "lucide-svelte";
	import { base } from "$app/paths";
	import { analyticsEvent } from "$lib/analytics";
	export let data;
	let defaultPattern = data.site?.pattern || "squares";
</script>

<div class="{defaultPattern}-pattern"></div>

<header class="blurry-bg relative z-50 mx-auto mt-2">
	<div class="container flex h-14 max-w-[840px] items-center">
		<a href={data.site.home ? data.site.home : base} class="mr-6 flex items-center space-x-2">
			{#if data.site.logo}
				<img
					src={data.site.logo.startsWith("/") ? base + data.site.logo : data.site.logo}
					class="w-8"
					alt={data.site.title}
					srcset=""
				/>
			{/if}
			{#if data.site.siteName}
				<span class="  inline-block text-[15px] font-bold lg:text-base">
					{data.site.siteName}
				</span>
			{/if}
		</a>
		<div class="flex w-full justify-end">
			{#if data.site.nav}
				<nav
					class="mr-4 hidden flex-wrap items-center space-x-6 text-sm font-medium md:flex"
				>
					{#each data.site.nav as navItem}
						<a
							href={navItem.url.startsWith("/") ? base + navItem.url : navItem.url}
							class="flex"
							on:click={() => analyticsEvent("nav", navItem.name)}
						>
							{#if navItem.iconURL}
								<img
									src={navItem.iconURL.startsWith("/")
										? base + navItem.iconURL
										: navItem.iconURL}
									class="mr-1.5 inline h-4"
									alt={navItem.name}
								/>
							{/if}
							<span>{navItem.name}</span>
						</a>
					{/each}
				</nav>
				<DropdownMenu.Root class="">
					<DropdownMenu.Trigger class="mr-2 flex md:hidden">
						<Button variant="outline" size="sm">
							<Menu size={14} />
						</Button>
					</DropdownMenu.Trigger>
					<DropdownMenu.Content>
						{#each data.site.nav as navItem}
							<DropdownMenu.Group>
								<DropdownMenu.Item>
									<a href={navItem.url}> {navItem.name} </a>
								</DropdownMenu.Item>
							</DropdownMenu.Group>
						{/each}
					</DropdownMenu.Content>
				</DropdownMenu.Root>
			{/if}
		</div>
	</div>
</header>
