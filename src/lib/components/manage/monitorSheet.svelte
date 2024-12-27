<script>
	import { Button } from "$lib/components/ui/button";
	import { Plus, X, Loader } from "lucide-svelte";
	import { Input } from "$lib/components/ui/input";
	import { Label } from "$lib/components/ui/label";

	import { base } from "$app/paths";
	import * as Select from "$lib/components/ui/select";
	import { createEventDispatcher } from "svelte";
	import {
		allRecordTypes,
		ValidateIpAddress,
		IsValidHost,
		IsValidNameServer
	} from "$lib/clientTools.js";

	const dispatch = createEventDispatcher();

	const defaultEval = `(function (statusCode, responseTime, responseData) {
	let statusCodeShort = Math.floor(statusCode/100);
    if(statusCode == 429 || (statusCodeShort >=2 && statusCodeShort <= 3)) {
        return {
			status: 'UP',
			latency: responseTime,
        }
    } 
	return {
		status: 'DOWN',
		latency: responseTime,
	}
})`;
	export let categories = [];
	let formState = "idle";

	export let newMonitor;

	let selectedCategory = categories.find((category) => category.name === newMonitor.categoryName);

	function handleFileChangeLogo(event) {
		const file = event.target.files[0];
		if (file) {
			const reader = new FileReader();
			reader.onload = () => {
				newMonitor.image = reader.result;
			};
			reader.readAsDataURL(file);
		}
	}
	function addHeader() {
		newMonitor.apiConfig.headers = [...newMonitor.apiConfig.headers, { key: "", value: "" }];
	}

	let invalidFormMessage = "";

	function isValidEval() {
		try {
			let evalResp = eval(newMonitor.apiConfig.eval + `(200, 1000, "e30=")`);

			if (
				evalResp === undefined ||
				evalResp === null ||
				evalResp.status === undefined ||
				evalResp.status === null ||
				evalResp.latency === undefined ||
				evalResp.latency === null
			) {
				return false;
			}
		} catch (error) {
			return false;
		}
		return true;
	}
	const IsValidURL = function (url) {
		return /^(http|https):\/\/[^ "]+$/.test(url);
	};

	async function saveOrUpdateMonitor() {
		console.log(newMonitor);
		invalidFormMessage = "";
		//tag should alphanumeric hyphen underscore only
		const tagRegex = /^[a-zA-Z0-9_-]+$/;
		if (!tagRegex.test(newMonitor.tag)) {
			invalidFormMessage = "Tag should be alphanumeric, hyphen, underscore only";
			return;
		}
		//name should be present
		if (!newMonitor.name) {
			invalidFormMessage = "Name is required";
			return;
		}
		//dayDegradedMinimumCount should be positive number
		if (newMonitor.dayDegradedMinimumCount < 0) {
			invalidFormMessage = "Day Degraded Minimum Count should be positive number";
			return;
		}
		//dayDownMinimumCount should be positive number
		if (newMonitor.dayDownMinimumCount < 0) {
			invalidFormMessage = "Day Down Minimum Count should be positive number";
			return;
		}

		//validating cron
		const cron = newMonitor.cron;
		const cronRegex =
			/^((\*|([0-5]?\d)(-[0-5]?\d)?(\/[1-9]\d*)?|([0-5]?\d(,[0-5]?\d)*))\s+){4}(\*|([0-7](,[0-7])*|([0-7]-[0-7])))$/;
		if (!cronRegex.test(cron)) {
			invalidFormMessage = "Invalid Cron";
			return;
		}

		//if monitor type is API
		if (newMonitor.monitorType === "API") {
			//validating url
			if (!newMonitor.apiConfig.url) {
				invalidFormMessage = "URL is required";
				return;
			}
			if (!IsValidURL(newMonitor.apiConfig.url)) {
				invalidFormMessage = "Invalid URL";
				return;
			}
			//validating eval
			if (!!newMonitor.apiConfig.eval && !isValidEval()) {
				invalidFormMessage = "Invalid eval";
				return;
			}
			newMonitor.typeData = JSON.stringify(newMonitor.apiConfig);
		} else if (newMonitor.monitorType === "PING") {
			//validating hostsV4

			let hostsV4 = newMonitor.pingConfig.hostsV4;
			let hostsV6 = newMonitor.pingConfig.hostsV6;
			let hasV4 = false;
			let hasV6 = false;
			if (hostsV4 && Array.isArray(hostsV4) && hostsV4.length > 0) {
				hostsV4.forEach((host) => {
					if (ValidateIpAddress(host) == "Invalid") {
						invalidFormMessage = `hostsV4 ${host} is not valid`;
						return;
					}
				});
				hasV4 = true;
			}
			if (hostsV6 && Array.isArray(hostsV6) && hostsV6.length > 0) {
				hostsV6.forEach((host) => {
					if (ValidateIpAddress(host) == "Invalid") {
						invalidFormMessage = `hostsV6 ${host} is not valid`;
						return;
					}
				});
				hasV6 = true;
			}

			if (!hasV4 && !hasV6) {
				invalidFormMessage = "hostsV4 or hostsV6 is required";
				return;
			}
			newMonitor.typeData = JSON.stringify(newMonitor.pingConfig);
		} else if (newMonitor.monitorType === "DNS") {
			//validating host
			if (!newMonitor.dnsConfig.host) {
				invalidFormMessage = "Host is required";
				return;
			}
			if (!IsValidHost(newMonitor.dnsConfig.host)) {
				invalidFormMessage = "Invalid Host";
				return;
			}
			//validating nameServer
			if (!newMonitor.dnsConfig.nameServer) {
				invalidFormMessage = "Name Server is required";
				return;
			}
			if (!IsValidNameServer(newMonitor.dnsConfig.nameServer)) {
				invalidFormMessage = "Invalid Name Server";
				return;
			}
			//atleast one value should be present
			if (
				!newMonitor.dnsConfig.values ||
				!Array.isArray(newMonitor.dnsConfig.values) ||
				newMonitor.dnsConfig.values.length === 0
			) {
				invalidFormMessage = "Atleast one value is required";
				return;
			}
			newMonitor.typeData = JSON.stringify(newMonitor.dnsConfig);
		}
		formState = "loading";

		try {
			let data = await fetch(base + "/manage/api/", {
				method: "POST",
				headers: {
					"Content-Type": "application/json"
				},
				body: JSON.stringify({ action: "storeMonitorData", data: newMonitor })
			});
			let resp = await data.json();
			if (resp.error) {
				invalidFormMessage = resp.error;
			} else {
				dispatch("closeModal", {});
			}
		} catch (error) {
			invalidFormMessage = "Error while saving data";
		} finally {
			formState = "idle";
		}
	}
</script>

<div class="fixed left-0 top-0 z-50 h-screen w-screen bg-card bg-opacity-20 backdrop-blur-sm">
	<div class="absolute right-0 top-0 h-screen w-[800px] bg-background shadow-xl">
		<div class=" absolute top-0 flex h-12 w-full justify-between gap-2 border-b p-3">
			{#if newMonitor.id}
				<h2 class="text-lg font-medium">Edit Monitor</h2>
			{:else}
				<h2 class="text-lg font-medium">Add Monitor</h2>
			{/if}
			<div>
				<label class="inline-flex cursor-pointer items-center">
					<input
						type="checkbox"
						value=""
						class="peer sr-only"
						checked={newMonitor.status == "ACTIVE"}
						on:change={() => {
							newMonitor.status =
								newMonitor.status == "ACTIVE" ? "INACTIVE" : "ACTIVE";
						}}
					/>
					<div
						class="peer relative h-6 w-11 rounded-full bg-gray-200 after:absolute after:start-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rtl:peer-checked:after:-translate-x-full dark:border-gray-600 dark:bg-gray-700 dark:peer-focus:ring-blue-800"
					></div>
				</label>
			</div>
		</div>
		<div class="mt-12 w-full overflow-y-auto p-3" style="height: calc(100vh - 7rem);">
			<div class="grid grid-cols-3 gap-x-2 gap-y-4">
				<div class="col-span-3">
					<Label for="logo">Image</Label>
					{#if !!newMonitor.image}
						<div class="relative mb-2 h-[48px] w-[48px] rounded-sm border p-1">
							<img src={newMonitor.image} class="" alt="" />
							<Button
								variant="secondary"
								class="absolute -right-2.5 -top-1.5 h-5 w-5 rounded-full p-0"
								on:click={() => (newMonitor.image = "")}
							>
								<X class="h-4 w-4" />
							</Button>
						</div>
					{/if}
					<Input
						class="w-1/2"
						id="logo"
						type="file"
						accept=".jpg, .jpeg, .png"
						on:change={(e) => {
							handleFileChangeLogo(e);
						}}
					/>
				</div>
				<div class="col-span-1">
					<Label for="tag">
						Tag
						<span class="text-red-500">*</span>
					</Label>
					<Input bind:value={newMonitor.tag} id="tag" />
				</div>
				<div class="col-span-1">
					<Label for="name">Name <span class="text-red-500">*</span></Label>
					<Input bind:value={newMonitor.name} id="name" />
				</div>
				<div class="col-span-3">
					<Label for="description">Description</Label>
					<Input bind:value={newMonitor.description} id="description" />
				</div>

				<div class="col-span-1">
					<Label for="cron">Cron <span class="text-red-500">*</span></Label>
					<Input bind:value={newMonitor.cron} id="cron" />
				</div>
				<div class="col-span-1">
					<Label for="defaultStatus">Default Status</Label>
					<Select.Root
						portal={null}
						onSelectedChange={(e) => (newMonitor.defaultStatus = e.value)}
					>
						<Select.Trigger id="defaultStatus">
							<Select.Value placeholder={newMonitor.defaultStatus} />
						</Select.Trigger>
						<Select.Content>
							<Select.Group>
								<Select.Label>Status</Select.Label>
								<Select.Item value="NONE" label="NONE" class="text-sm font-medium">
									NONE
								</Select.Item>
								<Select.Item value="UP" label="UP" class="text-sm font-medium">
									UP
								</Select.Item>
								<Select.Item value="DOWN" label="DOWN" class="text-sm font-medium">
									DOWN
								</Select.Item>
								<Select.Item
									value="DEGRADED"
									label="DEGRADED"
									class="text-sm font-medium"
								>
									DEGRADED
								</Select.Item>
							</Select.Group>
						</Select.Content>
					</Select.Root>
				</div>

				<div class="col-span-1">
					<Label for="categoryName">Category Name</Label>
					<Select.Root
						portal={null}
						bind:value={selectedCategory}
						onSelectedChange={(e) => (newMonitor.categoryName = e.value)}
					>
						<Select.Trigger id="categoryName">
							<Select.Value placeholder={newMonitor.categoryName} />
						</Select.Trigger>
						<Select.Content>
							<Select.Group>
								<Select.Label>Category</Select.Label>

								{#each categories as category}
									<Select.Item
										value={category.name}
										label={category.name}
										class="text-sm font-medium"
									>
										{category.name}
									</Select.Item>
								{/each}
							</Select.Group>
						</Select.Content>
					</Select.Root>
				</div>

				<div class="col-span-1">
					<Label for="dayDegradedMinimumCount">Day Degraded Minimum Count</Label>
					<Input
						bind:value={newMonitor.dayDegradedMinimumCount}
						id="dayDegradedMinimumCount"
					/>
				</div>
				<div class="col-span-1">
					<Label for="dayDownMinimumCount">Day Down Minimum Count</Label>
					<Input bind:value={newMonitor.dayDownMinimumCount} id="dayDownMinimumCount" />
				</div>
				<div class="col-span-1">
					<Label for="includeDegradedInDowntime">Include Degraded In Downtime</Label>
					<Select.Root
						portal={null}
						onSelectedChange={(e) => (newMonitor.includeDegradedInDowntime = e.value)}
					>
						<Select.Trigger id="includeDegradedInDowntime">
							<Select.Value placeholder={newMonitor.includeDegradedInDowntime} />
						</Select.Trigger>
						<Select.Content>
							<Select.Group>
								<Select.Label>Select YES or NO</Select.Label>
								<Select.Item value="YES" label="YES" class="text-sm font-medium">
									YES
								</Select.Item>
								<Select.Item value="NO" label="NO" class="text-sm font-medium">
									NO
								</Select.Item>
							</Select.Group>
						</Select.Content>
					</Select.Root>
				</div>
				<div class="col-span-1">
					<Label for="monitorType">Monitor Type</Label>
					<Select.Root
						portal={null}
						onSelectedChange={(e) => (newMonitor.monitorType = e.value)}
					>
						<Select.Trigger id="monitorType">
							<Select.Value placeholder={newMonitor.monitorType} />
						</Select.Trigger>
						<Select.Content>
							<Select.Group>
								<Select.Label>Type</Select.Label>
								<Select.Item value="NONE" label="NONE" class="text-sm font-medium">
									NONE
								</Select.Item>
								<Select.Item value="API" label="API" class="text-sm font-medium">
									API
								</Select.Item>
								<Select.Item value="PING" label="PING" class="text-sm font-medium">
									PING
								</Select.Item>
								<Select.Item value="DNS" label="DNS" class="text-sm font-medium">
									DNS
								</Select.Item>
							</Select.Group>
						</Select.Content>
					</Select.Root>
				</div>
			</div>
			{#if newMonitor.monitorType === "API"}
				<div class="mt-4 grid grid-cols-6 gap-2">
					<div class="col-span-1">
						<Label for="timeout">Timeout(ms)</Label>
						<Input bind:value={newMonitor.apiConfig.timeout} id="timeout" />
					</div>
					<div class="col-span-1">
						<Label for="method">Method</Label>
						<Select.Root
							portal={null}
							onSelectedChange={(e) => (newMonitor.apiConfig.method = e.value)}
						>
							<Select.Trigger id="method">
								<Select.Value placeholder={newMonitor.apiConfig.method} />
							</Select.Trigger>
							<Select.Content>
								<Select.Group>
									<Select.Label>Method</Select.Label>
									<Select.Item
										value="GET"
										label="GET"
										class="text-sm font-medium"
									>
										GET
									</Select.Item>
									<Select.Item
										value="POST"
										label="POST"
										class="text-sm font-medium"
									>
										POST
									</Select.Item>
									<Select.Item
										value="PUT"
										label="PUT"
										class="text-sm font-medium"
									>
										PUT
									</Select.Item>
									<Select.Item
										value="PATCH"
										label="PATCH"
										class="text-sm font-medium"
									>
										PATCH
									</Select.Item>
									<Select.Item
										value="DELETE"
										label="DELETE"
										class="text-sm font-medium"
									>
										DELETE
									</Select.Item>
								</Select.Group>
							</Select.Content>
						</Select.Root>
					</div>
					<div class="col-span-4">
						<Label for="url">URL</Label>
						<Input
							bind:value={newMonitor.apiConfig.url}
							id="url"
							placeholder="https://example.com/api/users"
						/>
					</div>
					<div class="col-span-6">
						<Label for="url">Headers</Label>
						<div class="grid grid-cols-6 gap-2">
							{#each newMonitor.apiConfig.headers as header, index}
								<div class="col-span-2">
									<Input
										bind:value={header.key}
										id="header"
										placeholder="Content-Type"
									/>
								</div>
								<div class="col-span-3">
									<Input
										bind:value={header.value}
										id="header"
										placeholder="application/json"
									/>
								</div>
								<div class="col-span-1 pt-2">
									<Button
										class=" h-6 w-6 p-1"
										variant="secondary"
										on:click={() => {
											newMonitor.apiConfig.headers =
												newMonitor.apiConfig.headers.filter(
													(_, i) => i !== index
												);
										}}
									>
										<X class="h-5 w-5" />
									</Button>
								</div>
							{/each}
						</div>
						<div class="relative pb-8 pt-2">
							<hr
								class="border-1 border-border-input relative top-4 h-px border-dashed"
							/>

							<Button
								on:click={addHeader}
								variant="secondary"
								class="absolute left-1/2 h-8 w-8 -translate-x-1/2 p-0  "
							>
								<Plus class="h-4 w-4 " />
							</Button>
						</div>
					</div>

					{#if newMonitor.apiConfig.method[0] == "P"}
						<div class="col-span-6">
							<Label for="body">Body</Label>
							<textarea
								bind:value={newMonitor.apiConfig.body}
								id="body"
								class="h-48 w-full rounded-sm border p-2"
								placeholder={JSON.stringify({ name: "Kener" }, null, 2)}
							></textarea>
						</div>
					{/if}
					<div class="col-span-6">
						<Label for="eval">Eval</Label>
						<textarea
							bind:value={newMonitor.apiConfig.eval}
							id="eval"
							class="h-96 w-full rounded-sm border p-2"
							placeholder={defaultEval}
						></textarea>
					</div>
				</div>
			{:else if newMonitor.monitorType == "PING"}
				<div class="mt-4 grid grid-cols-6 gap-2">
					<div class="col-span-6">
						<Label for="hostsV4">Hosts V4</Label>
						<div class="grid grid-cols-7 gap-2">
							{#each newMonitor.pingConfig.hostsV4 as host, index}
								<div class="relative col-span-2">
									<Input
										bind:value={host}
										id="hostsV4"
										class="pr-10"
										placeholder="172.12.14.42"
									/>
									<Button
										class="absolute right-3 top-2 h-6 w-6 p-1"
										variant="secondary"
										on:click={() => {
											newMonitor.pingConfig.hostsV4 =
												newMonitor.pingConfig.hostsV4.filter(
													(_, i) => i !== index
												);
										}}
									>
										<X class="h-5 w-5" />
									</Button>
								</div>
							{/each}
							<div class="col-span-1 pt-2">
								<Button
									class="h-6 w-6 p-1"
									variant="secondary"
									on:click={() => {
										newMonitor.pingConfig.hostsV4 = [
											...newMonitor.pingConfig.hostsV4,
											""
										];
									}}
								>
									<Plus class="h-5 w-5" />
								</Button>
							</div>
						</div>
						<Label for="hostsV6">Hosts V6</Label>
						<div class="grid grid-cols-5 gap-2">
							{#each newMonitor.pingConfig.hostsV6 as host, index}
								<div class="relative col-span-2">
									<Input
										bind:value={host}
										id="hostsV6"
										class="pr-10"
										placeholder="2001:0db8:85a3:0000:0000:8a2e:0370:7334"
									/>
									<Button
										class="absolute right-3 top-2 h-6 w-6 p-1"
										variant="secondary"
										on:click={() => {
											newMonitor.pingConfig.hostsV6 =
												newMonitor.pingConfig.hostsV6.filter(
													(_, i) => i !== index
												);
										}}
									>
										<X class="h-5 w-5" />
									</Button>
								</div>
							{/each}
							<div class="col-span-1 pt-2">
								<Button
									class="h-6 w-6 p-1"
									variant="secondary"
									on:click={() => {
										newMonitor.pingConfig.hostsV6 = [
											...newMonitor.pingConfig.hostsV6,
											""
										];
									}}
								>
									<Plus class="h-5 w-5" />
								</Button>
							</div>
						</div>
					</div>
				</div>
			{:else if newMonitor.monitorType == "DNS"}
				<div class="mt-4 grid grid-cols-4 gap-2">
					<div class="col-span-2">
						<Label for="host">Host</Label>
						<Input bind:value={newMonitor.dnsConfig.host} id="host" />
					</div>
					<div class="col-span-2">
						<Label for="lookupRecord">Lookup Record</Label>
						<Select.Root
							portal={null}
							onSelectedChange={(e) => (newMonitor.dnsConfig.lookupRecord = e.value)}
						>
							<Select.Trigger id="lookupRecord">
								<Select.Value placeholder={newMonitor.dnsConfig.lookupRecord} />
							</Select.Trigger>
							<Select.Content class="max-h-56 overflow-y-auto">
								<Select.Group>
									<Select.Label>Record</Select.Label>
									{#each Object.keys(allRecordTypes) as record}
										<Select.Item
											value={record}
											label={record}
											class="text-sm font-medium"
										>
											{record}
										</Select.Item>
									{/each}
								</Select.Group>
							</Select.Content>
						</Select.Root>
					</div>
					<div class="col-span-2">
						<Label for="nameServer">Name Server</Label>
						<Input bind:value={newMonitor.dnsConfig.nameServer} id="nameServer" />
					</div>
					<div class="col-span-2">
						<Label for="matchType">Match Type</Label>
						<Select.Root
							portal={null}
							onSelectedChange={(e) => (newMonitor.dnsConfig.matchType = e.value)}
						>
							<Select.Trigger id="matchType">
								<Select.Value placeholder={newMonitor.dnsConfig.matchType} />
							</Select.Trigger>
							<Select.Content>
								<Select.Group>
									<Select.Label>Match Type</Select.Label>
									<Select.Item
										value="ANY"
										label="ANY"
										class="text-sm font-medium"
									>
										ANY
									</Select.Item>
									<Select.Item
										value="ALL"
										label="ALL"
										class="text-sm font-medium"
									>
										ALL
									</Select.Item>
								</Select.Group>
							</Select.Content>
						</Select.Root>
					</div>

					<div class="col-span-4">
						<Label for="values">Values</Label>
						<div class="grid grid-cols-7 gap-2">
							{#each newMonitor.dnsConfig.values as value, index}
								<div class="relative col-span-3">
									<Input
										bind:value
										id="values"
										class="pr-10"
										placeholder="rajnandan1.github.io"
									/>
									<Button
										class="absolute right-3 top-2 h-6 w-6 p-1"
										variant="secondary"
										on:click={() => {
											newMonitor.dnsConfig.values =
												newMonitor.dnsConfig.values.filter(
													(_, i) => i !== index
												);
										}}
									>
										<X class="h-5 w-5" />
									</Button>
								</div>
							{/each}
							<div class="col-span-1 pt-2">
								<Button
									class="h-6 w-6 p-1"
									variant="secondary"
									on:click={() => {
										newMonitor.dnsConfig.values = [
											...newMonitor.dnsConfig.values,
											""
										];
									}}
								>
									<Plus class="h-5 w-5" />
								</Button>
							</div>
						</div>
					</div>
				</div>
			{/if}
		</div>
		<div class="absolute bottom-0 grid h-16 w-full grid-cols-6 gap-2 border-t p-3">
			<div class="col-span-1">
				<Button
					variant="ghost"
					on:click={(e) => {
						dispatch("closeModal", {});
					}}
					class="col-span-1 w-full">Cancel</Button
				>
			</div>
			<div class="col-span-4 py-2.5">
				<p class="text-right text-xs font-medium text-red-500">{invalidFormMessage}</p>
			</div>
			<div class="col-span-1">
				<Button
					class="col-span-1 w-full"
					on:click={saveOrUpdateMonitor}
					disabled={formState === "loading"}
				>
					Save
					{#if formState === "loading"}
						<Loader class="ml-2 inline h-4 w-4 animate-spin" />
					{/if}
				</Button>
			</div>
		</div>
	</div>
</div>
