<script>
	import { base } from "$app/paths";
	import { Button } from "$lib/components/ui/button";
	import { Input } from "$lib/components/ui/input";
	import { Label } from "$lib/components/ui/label";
	import * as Alert from "$lib/components/ui/alert";
	import { onMount } from "svelte";

	let form = {
		email: "",
		password: "",
		name: ""
	};
	export let data = {
		error: null,
		isSecretSet: false
	};

	let httpDomainPort = "";

	onMount(() => {
		httpDomainPort = window.location.protocol + "//" + window.location.host;
	});
</script>

<div class="flex min-h-full flex-col justify-center px-6 py-12 lg:px-8">
	<div class="sm:mx-auto sm:w-full sm:max-w-sm">
		<img class="mx-auto h-10 w-auto" src="{base}/logo.png" alt="Your Company" />
		<h2 class="mt-10 text-center text-2xl/9 font-bold tracking-tight">Set up Kener.ing</h2>
		<p class="mt-4 text-center">Welcome to Kener.ing! Let's get you set up.</p>
	</div>
	{#if data.isSecretSet && data.isOriginSet}
		<div class="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
			{#if data.error}
				<Alert.Root variant="destructive" class="my-4">
					<Alert.Title>Error</Alert.Title>
					<Alert.Description>{data.error}</Alert.Description>
				</Alert.Root>
			{/if}

			<form class="space-y-6" action="{base}/manage/setup/submit" method="POST">
				<div>
					<label for="email" class="block text-sm/6 font-medium">Your Name</label>
					<div class="mt-2">
						<Input
							bind:value={form.name}
							type="text"
							name="name"
							id="form_name"
							autocomplete="first-name"
							placeholder="Jane Doe"
							required
						/>
					</div>
				</div>
				<div>
					<label for="email" class="block text-sm/6 font-medium">Email address</label>
					<div class="mt-2">
						<Input
							bind:value={form.email}
							type="email"
							name="email"
							id="form_email"
							autocomplete="email"
							placeholder="user@example.com"
							required
						/>
						<p class="mt-0.5 text-xs text-muted-foreground">
							This will email address will use be used to login so that you can manage
							this instance of kener.
						</p>
					</div>
				</div>

				<div>
					<div class="flex items-center justify-between">
						<label for="password" class="block text-sm/6 font-medium">Password</label>
					</div>
					<div class="mt-2">
						<div class="mt-2">
							<Input
								bind:value={form.password}
								type="password"
								name="password"
								id="form_password"
								autocomplete="password"
								placeholder="***********"
								required
							/>
							<p class="mt-0.5 text-xs text-muted-foreground">
								Please make sure you remember this password. Other wise you will
								have to reset it manually from db.
							</p>
						</div>
					</div>
				</div>

				<div>
					<Button type="submit" class="w-full">Let's Go</Button>
					<p class="mt-4 text-center text-xs font-semibold">
						Already set up done? Please go to <a
							href="{base}/manage/signin"
							class="text-primary underline decoration-1">signin page</a
						>
					</p>
				</div>
			</form>
		</div>
	{:else}
		<div class="mt-10 sm:mx-auto sm:w-full sm:max-w-md">
			{#if !!!data.isSecretSet}
				<div class="rounded-md bg-card p-4">
					<p class="text-lg/6">
						Environment variable <span class="font-mono text-yellow-500"
							>KENER_SECRET_KEY</span
						>
						not found.
					</p>
					<hr class="my-2" />
					<p class="text-muted-foreground">
						Please set the environment variable <span class="font-mono"
							>KENER_SECRET_KEY</span
						>. Then restart the server / refresh this page. Check the
						<a
							href="https://kener.ing/docs/environment-vars"
							target="_blank"
							class="text-primary">documentation</a
						> for more Information.
					</p>
				</div>
			{/if}
			{#if !!!data.isOriginSet}
				<div class="mt-3 rounded-md bg-card p-4">
					<p class="text-lg/6">
						Environment variable <span class="font-mono text-yellow-500">ORIGIN</span>
						not found.
					</p>
					<hr class="my-2" />
					<p class="text-muted-foreground">
						Please set the environment variable <span
							class="block font-mono text-primary">ORIGIN={httpDomainPort}</span
						>
						Then restart the server / refresh this page. Check the
						<a
							href="https://kener.ing/docs/environment-vars"
							target="_blank"
							class="text-primary">documentation</a
						> for more Information.
					</p>
				</div>
			{/if}
		</div>
	{/if}
</div>
