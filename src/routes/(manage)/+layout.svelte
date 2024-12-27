<script>
	import "../../app.postcss";
	import "../../kener.css";
	import "../../manage.css";
	import { base } from "$app/paths";
	import * as DropdownMenu from "$lib/components/ui/dropdown-menu";
	import Sun from "lucide-svelte/icons/sun";
	import Moon from "lucide-svelte/icons/moon";
	import { Button } from "$lib/components/ui/button";

	import { Play, User } from "lucide-svelte";
	import { setMode, mode, ModeWatcher } from "mode-watcher";

	export let data;
	let thisYear = new Date().getFullYear();
	function toggleMode() {
		if ($mode === "light") {
			setMode("dark");
		} else {
			setMode("light");
		}

		analyticsEvent("theme_change", {
			theme: $mode
		});
	}

	setMode("dark");
</script>

<ModeWatcher />
<svelte:head>
	<title>Manage Kener</title>
	<meta name="description" content="Manage your Kener project" />
</svelte:head>
<header class="sticky inset-x-0 top-0 z-50 mx-auto flex max-w-4xl px-8">
	<div class="mt-4 flex w-full justify-between rounded-lg border bg-card px-5 py-4">
		<div class="mt-2 flex gap-x-1.5">
			<img src="{base}/logo.png" alt="Kener" class="inline h-6 w-6" />
			<h1 class="font-semibold">Manage Kener</h1>
		</div>
		<div class="flex">
			<Button on:click={toggleMode} variant="ghost" size="icon" class="flex">
				<Sun
					class="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0"
				/>
				<Moon
					class="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100"
				/>
				<span class="sr-only">Toggle theme</span>
			</Button>
			<DropdownMenu.Root>
				<DropdownMenu.Trigger>
					<Button size="icon" variant="ghost">
						<User class="h-4 w-4" />
					</Button>
				</DropdownMenu.Trigger>
				<DropdownMenu.Content>
					<DropdownMenu.Group>
						<DropdownMenu.Label class="text-xs">My Account</DropdownMenu.Label>
						<DropdownMenu.Separator />
						<DropdownMenu.Item class="text-xs font-semibold">
							<a href="{base}/signin/logout">Logout</a>
						</DropdownMenu.Item>
					</DropdownMenu.Group>
				</DropdownMenu.Content>
			</DropdownMenu.Root>
			<Button variant="secondary" class="ml-4" target="_blank" href="{base}/">
				<Play class="mr-2 h-4 w-4" />
				<span>Preview</span>
			</Button>
		</div>
	</div>
</header>
<main class="manage">
	<!-- ========== HEADER ========== -->
	<!-- ========== HEADER ========== -->

	<!-- ========== END HEADER ========== -->
	<!-- ========== END HEADER ========== -->
	<div class="container max-w-4xl pt-0">
		<slot></slot>
	</div>
</main>

<!-- ========== FOOTER ========== -->
<footer class="mx-auto mt-8 w-full max-w-2xl px-4 sm:px-6 lg:px-8">
	<div class="border-t py-6 dark:border-neutral-700">
		<div class="flex flex-wrap items-center justify-between gap-2">
			<div>
				<p class="text-xs text-muted-foreground">
					Kener.ing by <a
						class="text-xs font-semibold text-muted-foreground hover:underline"
						href="https://www.rajnandan.com">Raj Nandan Sharma</a
					>
				</p>
			</div>
			<!-- End Col -->

			<!-- List -->
			<ul class="flex flex-wrap items-center">
				<li
					class="before:size-[3px] relative inline-block pe-4 text-xs before:absolute before:end-1.5 before:top-1/2 before:-translate-y-1/2 before:rounded-full before:bg-gray-400 last:pe-0 last-of-type:before:hidden dark:text-neutral-500 dark:before:bg-neutral-600"
				>
					<a
						target="_blank"
						class="text-xs font-medium text-muted-foreground hover:underline hover:decoration-1 focus:decoration-1 focus:outline-none"
						href="https://github.com/sponsors/rajnandan1"
					>
						Donate
					</a>
				</li>
				<li
					class="before:size-[3px] relative inline-block pe-4 text-xs before:absolute before:end-1.5 before:top-1/2 before:-translate-y-1/2 before:rounded-full before:bg-gray-400 last:pe-0 last-of-type:before:hidden dark:text-neutral-500 dark:before:bg-neutral-600"
				>
					<a
						target="_blank"
						class="text-xs font-medium text-muted-foreground hover:underline hover:decoration-1 focus:decoration-1 focus:outline-none"
						href="https://twitter.com/_rajnandan_"
					>
						Contact
					</a>
				</li>
				<li
					class="before:size-[3px] relative inline-block pe-4 text-xs before:absolute before:end-1.5 before:top-1/2 before:-translate-y-1/2 before:rounded-full before:bg-gray-400 last:pe-0 last-of-type:before:hidden dark:text-neutral-500 dark:before:bg-neutral-600"
				>
					<a
						target="_blank"
						class="text-xs font-medium text-muted-foreground hover:underline hover:decoration-1 focus:decoration-1 focus:outline-none"
						href="https://discord.gg/uSTpnuK9XR"
					>
						Discord
					</a>
				</li>
				<li
					class="before:size-[3px] relative inline-block pe-4 text-xs before:absolute before:end-1.5 before:top-1/2 before:-translate-y-1/2 before:rounded-full before:bg-gray-400 last:pe-0 last-of-type:before:hidden dark:text-neutral-500 dark:before:bg-neutral-600"
				>
					<a
						target="_blank"
						class="text-xs font-medium text-muted-foreground hover:underline hover:decoration-1 focus:decoration-1 focus:outline-none"
						href="https://github.com/rajnandan1/kener"
					>
						Github
					</a>
				</li>
			</ul>
			<!-- End List -->
		</div>
	</div>
</footer>
<!-- ========== END FOOTER ========== -->
