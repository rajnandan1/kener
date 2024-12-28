<script>
	import { base } from "$app/paths";
	import { Button } from "$lib/components/ui/button";
	import { Input } from "$lib/components/ui/input";
	import { Label } from "$lib/components/ui/label";
	import * as Alert from "$lib/components/ui/alert";

	let form = {
		email: "",
		password: ""
	};
	export let data = {
		error: null
	};
</script>

<svelte:head>
	<title>Login Kener</title>
</svelte:head>
<div class="flex min-h-full flex-col justify-center px-6 py-12 lg:px-8">
	<div class="sm:mx-auto sm:w-full sm:max-w-sm">
		<img class="mx-auto h-10 w-auto" src="{base}/logo.png" alt="Your Company" />
		<h2 class="mt-10 text-center text-2xl/9 font-bold tracking-tight">Sign in</h2>
		<p class="mt-4 text-center">Sign in to manage your kener instance.</p>
	</div>

	<div class="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
		{#if data.error}
			<Alert.Root variant="destructive" class="my-4">
				<Alert.Title>Error</Alert.Title>
				<Alert.Description>{data.error}</Alert.Description>
			</Alert.Root>
		{/if}

		<form class="space-y-6" action="{base}/signin/submit" method="POST">
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
					</div>
				</div>
			</div>

			<div>
				<Button type="submit" class="w-full">Sign In</Button>
			</div>
		</form>
	</div>
</div>
