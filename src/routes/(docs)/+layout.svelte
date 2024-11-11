<script>
	import "../../app.postcss";
	import "../../kener.css";
	import { Button } from "$lib/components/ui/button";
	import Sun from "lucide-svelte/icons/sun";
	import Moon from "lucide-svelte/icons/moon";
	import { onMount } from "svelte";
	import { base } from "$app/paths";
	let defaultTheme = "light";
	export let data;
	let siteStructure = data.siteStructure;
	let sidebar = siteStructure.sidebar;
	let docFilePath = data.docFilePath;
	let tableOfContents = [];
	function toggleMode(defaultTheme) {
		let classList = document.documentElement.classList;
		if (classList.contains("dark")) {
			classList.remove("dark");
			localStorage.setItem("theme", "light");
		} else {
			classList.add("dark");
			localStorage.setItem("theme", "dark");
		}
	}

	function setTheme() {
		let theme = localStorage.getItem("theme") || defaultTheme;
		if (theme === "dark") {
			document.documentElement.classList.add("dark");
		} else {
			document.documentElement.classList.remove("dark");
		}
	}

	function activateSidebar(selectedDoc) {
		for (let i = 0; i < sidebar.length; i++) {
			const item = sidebar[i];
			for (let j = 0; j < item.children.length; j++) {
				const subItem = item.children[j];
				if (subItem.file == selectedDoc) {
					subItem.active = true;
					sidebar[i].children[j].active = true;
				} else {
					subItem.active = false;
					sidebar[i].children[j].active = false;
				}
			}
		}
	}

	function pageChange(e) {
		if (e.detail.docFilePath) {
			activateSidebar(e.detail.docFilePath);
		}
	}
	function updateTableOfContents(e) {
		if (e.detail.rightbar) {
			tableOfContents = e.detail.rightbar;
		}
	}

	onMount(() => {
		setTheme();
	});
</script>

<svelte:window on:pagechange={pageChange} on:rightbar={updateTableOfContents} />
<svelte:head>
	<link rel="icon" id="kener-app-favicon" href="{base}/logo96.png" />
</svelte:head>
<nav class="fixed left-0 right-0 top-0 z-30 h-16 border-b bg-background">
	<div class="mx-auto h-full px-4 sm:px-6 lg:px-8">
		<div class="flex h-full items-center justify-between">
			<!-- Logo/Brand -->
			<div class="flex items-center space-x-3">
				<a href="/" class="flex items-center space-x-3">
					<!-- Document Icon - Replace with your own logo -->
					<img src="https://kener.ing/logo.png" class="h-8 w-8" alt="" />
					<span class="text-xl font-semibold">Docs</span>
				</a>
			</div>

			<!-- Navigation Links -->
			<div class="hidden md:block">
				<div class="flex items-center space-x-8">
					<a href="/docs" class="text-sm font-medium">Documentation</a>
					<a href="/api" class="text-sm font-medium">API</a>
					<a href="/examples" class="text-sm font-medium">Examples</a>
					<a href="/support" class="text-sm font-medium">Support</a>
				</div>
			</div>

			<!-- Mobile Menu Button -->
			<div class="md:hidden">
				<button type="button" class="hover: text-muted-foreground">
					<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M4 6h16M4 12h16M4 18h16"
						/>
					</svg>
				</button>
			</div>
		</div>
	</div>
</nav>

<!-- Sidebar -->
<aside class="fixed bottom-0 left-0 top-16 w-72 overflow-y-auto border-r">
	<nav class="p-6">
		<!-- Getting Started Section -->
		{#each sidebar as item}
			<div class="mb-4">
				<h3
					class="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground"
				>
					{item.sectionTitle}
				</h3>
				<div class="">
					{#each item.children as child}
						<a
							href={child.link}
							class="group flex items-center rounded-md px-3 py-2 text-sm font-medium hover:underline {!!child.active
								? 'bg-muted'
								: ''}"
						>
							{child.title}
						</a>
					{/each}
				</div>
			</div>
		{/each}
	</nav>
</aside>

<!-- Main Content -->
<main class="ml-72 min-h-screen pt-16">
	<div class="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8 lg:pr-64">
		<!-- Content Header -->
		<div
			class="prose prose-stone max-w-none dark:prose-invert prose-code:rounded prose-code:py-[0.2rem] prose-code:font-mono prose-code:text-sm prose-code:font-normal dark:prose-pre:bg-neutral-900"
		>
			<slot />
		</div>
	</div>
</main>
{#if tableOfContents.length > 0}
	<div class="fixed bottom-0 right-0 top-16 hidden w-64 overflow-y-auto px-6 py-10 lg:block">
		<h4 class="mb-3 text-sm font-semibold uppercase tracking-wider">On this page</h4>
		<nav class="space-y-2">
			{#each tableOfContents as item}
				<a
					href="#{item.id}"
					class="block overflow-hidden text-ellipsis whitespace-nowrap text-xs text-muted-foreground hover:underline {item.level ==
					3
						? 'ml-4'
						: ''}"
				>
					{item.text}
				</a>
			{/each}
		</nav>
	</div>
{/if}
<div class="fixed bottom-4 right-4">
	<Button on:click={toggleMode} variant="ghost" size="icon" class="flex">
		<Sun
			class="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0"
		/>
		<Moon
			class="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100"
		/>
		<span class="sr-only">Toggle theme</span>
	</Button>
</div>
