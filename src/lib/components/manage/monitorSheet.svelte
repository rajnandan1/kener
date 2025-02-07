<script>
	import { Button } from "$lib/components/ui/button";
	import { Plus, X, Loader } from "lucide-svelte";
	import { Input } from "$lib/components/ui/input";
	import { Label } from "$lib/components/ui/label";
	import { clickOutsideAction, slide } from "svelte-legos";
	import { ChevronRight, Trash } from "lucide-svelte";
	import { base } from "$app/paths";
	import * as Select from "$lib/components/ui/select";
	import { createEventDispatcher } from "svelte";
	import {
		allRecordTypes,
		ValidateIpAddress,
		ValidateCronExpression,
		IsValidHost,
		IsValidNameServer
	} from "$lib/clientTools.js";

	const dispatch = createEventDispatcher();

	const defaultEval = `(async function (statusCode, responseTime, responseData) {
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
	let loadingLogo = false;

	let selectedCategory = categories.find(
		(category) => category.name === newMonitor.category_name
	);

	async function handleFileChangeLogo(event) {
		const file = event.target.files[0];
		if (!file) {
			event.target.value = "";
			alert("Please select a file to upload.");
			return;
		}
		if (file.size > 100000) {
			event.target.value = "";
			alert("File size should be less than 100KB");
			return;
		}

		loadingLogo = true;
		const formData = new FormData();
		formData.append("image", file);
		try {
			const response = await fetch(base + "/manage/app/upload", {
				method: "POST",
				body: formData
			});

			if (response.ok) {
				const result = await response.json();
				newMonitor.image = "/uploads/" + result.filename;
			} else {
				alert("Failed to upload file.");
			}
		} catch (error) {
			alert("An error occurred while uploading the file.");
		} finally {
			loadingLogo = false;
		}
	}
	function addHeader() {
		newMonitor.apiConfig.headers = [...newMonitor.apiConfig.headers, { key: "", value: "" }];
	}

	let invalidFormMessage = "";

	async function isValidEval(ev) {
		if (ev.endsWith(";")) {
			invalidFormMessage = "Eval should not end with semicolon";
			return false;
		}
		//has to start with ( and end with )
		if (!ev.startsWith("(") || !ev.endsWith(")")) {
			invalidFormMessage =
				"Eval should start with ( and end with ). It is an anonymous function";
			return false;
		}
		try {
			// let evalResp = await eval(newMonitor.apiConfig.eval + `(200, 1000, "e30=")`);
			new Function(ev);
			return true; // The code is valid
		} catch (error) {
			invalidFormMessage = error.message + " in eval.";
			return false;
		}
	}
	const IsValidURL = function (url) {
		return /^(http|https):\/\/[^ "]+$/.test(url);
	};

	async function saveOrUpdateMonitor() {
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
		//day_degraded_minimum_count should be positive number
		if (newMonitor.day_degraded_minimum_count < 1) {
			invalidFormMessage = "Day Degraded Minimum Count should be greater than 0";
			return;
		}
		//day_down_minimum_count should be positive number
		if (newMonitor.day_down_minimum_count < 1) {
			invalidFormMessage = "Day Down Minimum Count should be greater than 0";
			return;
		}

		//validating cron
		const cron = newMonitor.cron;
		let cronValidation = ValidateCronExpression(cron);
		if (cronValidation.isValid === false) {
			invalidFormMessage = "Cron invalid: " + cronValidation.message;
			return;
		}
		//if monitor type is API
		if (newMonitor.monitor_type === "API") {
			//validating url
			if (!newMonitor.apiConfig.url) {
				invalidFormMessage = "URL is required";
				return;
			}
			if (!IsValidURL(newMonitor.apiConfig.url)) {
				invalidFormMessage = "Invalid URL";
				return;
			}

			//timeout should be positive number
			if (newMonitor.apiConfig.timeout < 1) {
				invalidFormMessage = "Timeout should be greater than 0";
				return;
			}

			//validating eval
			if (!!newMonitor.apiConfig.eval) {
				newMonitor.apiConfig.eval = newMonitor.apiConfig.eval.trim();

				if (!(await isValidEval(newMonitor.apiConfig.eval))) {
					invalidFormMessage = invalidFormMessage + "Invalid eval";
					return;
				}
			}
			newMonitor.type_data = JSON.stringify(newMonitor.apiConfig);
		} else if (newMonitor.monitor_type === "PING") {
			let hosts = newMonitor.pingConfig.hosts;
			if (hosts && Array.isArray(hosts) && hosts.length > 0) {
				for (let i = 0; i < hosts.length; i++) {
					if (ValidateIpAddress(hosts[i].host) != hosts[i].type) {
						invalidFormMessage = `Host ${hosts[i].host} is not of type ${hosts[i].type}`;
						return;
					}
					//validating timeout
					if (hosts[i].timeout < 1) {
						invalidFormMessage = "Timeout should be greater than 0";
						return;
					}
					//validating count
					if (hosts[i].count < 1) {
						invalidFormMessage = "Count should be greater than 0";
						return;
					}
				}
			} else {
				invalidFormMessage = "Host is required";
				return;
			}
			if (!!newMonitor.pingConfig.pingEval) {
				newMonitor.pingConfig.pingEval = newMonitor.pingConfig.pingEval.trim();
				if (!(await isValidEval(newMonitor.pingConfig.pingEval))) {
					invalidFormMessage = invalidFormMessage + "Invalid eval";
					return;
				}
			}

			newMonitor.type_data = JSON.stringify(newMonitor.pingConfig);
		} else if (newMonitor.monitor_type === "TCP") {
			//validating hostsV4

			let hosts = newMonitor.tcpConfig.hosts;
			if (hosts && Array.isArray(hosts) && hosts.length > 0) {
				for (let i = 0; i < hosts.length; i++) {
					if (ValidateIpAddress(hosts[i].host) != hosts[i].type) {
						invalidFormMessage = `Host ${hosts[i].host} is not of type ${hosts[i].type}`;
						return;
					}
					//validating timeout
					if (hosts[i].timeout < 1) {
						invalidFormMessage = "Timeout should be greater than 0";
						return;
					}
					//validating port
					if (hosts[i].port < 1 || hosts[i].port > 65535) {
						invalidFormMessage = "Port should valid";
						return;
					}
				}
			} else {
				invalidFormMessage = "Host is required";
				return;
			}
			if (!!newMonitor.tcpConfig.tcpEval) {
				newMonitor.tcpConfig.tcpEval = newMonitor.tcpConfig.tcpEval.trim();
				if (!(await isValidEval(newMonitor.tcpConfig.tcpEval))) {
					invalidFormMessage = invalidFormMessage + "Invalid eval";
					return;
				}
			}

			newMonitor.type_data = JSON.stringify(newMonitor.tcpConfig);
		} else if (newMonitor.monitor_type === "DNS") {
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
			newMonitor.type_data = JSON.stringify(newMonitor.dnsConfig);
		}
		formState = "loading";

		try {
			let data = await fetch(base + "/manage/app/api/", {
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
	<div
		transition:slide={{ direction: "right", duration: 200 }}
		use:clickOutsideAction
		on:clickoutside={(e) => {
			dispatch("closeModal", {});
		}}
		class="absolute right-0 top-0 h-screen w-[800px] bg-background px-3 shadow-xl"
	>
		<Button
			variant="outline"
			size="icon"
			class="absolute right-[785px] top-8  z-10 h-8 w-8 rounded-md"
			on:click={(e) => {
				dispatch("closeModal", {});
			}}
		>
			<ChevronRight class="h-6 w-6 " />
		</Button>
		<div class="absolute top-0 flex h-12 w-full justify-between gap-2 border-b p-3 pr-6">
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
							<img src={base + newMonitor.image} class="" alt="" />
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
						disabled={loadingLogo}
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
					<Input bind:value={newMonitor.tag} id="tag" placeholder="Add a Tag" />
				</div>
				<div class="col-span-1">
					<Label for="name">Name <span class="text-red-500">*</span></Label>
					<Input bind:value={newMonitor.name} id="name" placeholder="Add a Name" />
				</div>
				<div class="col-span-3">
					<Label for="description">Description</Label>
					<Input
						bind:value={newMonitor.description}
						id="description"
						placeholder="Add a description for the monitor"
					/>
				</div>

				<div class="col-span-1">
					<Label for="cron">Cron <span class="text-red-500">*</span></Label>
					<Input bind:value={newMonitor.cron} id="cron" />
				</div>
				<div class="col-span-1">
					<Label for="default_status">Default Status</Label>
					<Select.Root
						portal={null}
						onSelectedChange={(e) => (newMonitor.default_status = e.value)}
					>
						<Select.Trigger id="default_status">
							<Select.Value placeholder={newMonitor.default_status} />
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
					<Label for="category_name">Category Name</Label>
					<Select.Root
						portal={null}
						bind:value={selectedCategory}
						onSelectedChange={(e) => (newMonitor.category_name = e.value)}
					>
						<Select.Trigger id="category_name">
							<Select.Value placeholder={newMonitor.category_name} />
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
					<Label for="day_degraded_minimum_count">
						Day Degraded Minimum Count <span class="text-red-500">*</span>
					</Label>
					<Input
						bind:value={newMonitor.day_degraded_minimum_count}
						id="day_degraded_minimum_count"
					/>
				</div>
				<div class="col-span-1">
					<Label for="day_down_minimum_count">
						Day Down Minimum Count <span class="text-red-500">*</span>
					</Label>
					<Input
						bind:value={newMonitor.day_down_minimum_count}
						id="day_down_minimum_count"
					/>
				</div>
				<div class="col-span-1">
					<Label for="include_degraded_in_downtime">Include Degraded In Downtime</Label>
					<Select.Root
						portal={null}
						onSelectedChange={(e) =>
							(newMonitor.include_degraded_in_downtime = e.value)}
					>
						<Select.Trigger id="include_degraded_in_downtime">
							<Select.Value placeholder={newMonitor.include_degraded_in_downtime} />
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
					<Label for="monitor_type">Monitor Type</Label>
					<Select.Root
						portal={null}
						onSelectedChange={(e) => (newMonitor.monitor_type = e.value)}
						selected={{
							value: newMonitor.monitor_type,
							label: newMonitor.monitor_type
						}}
					>
						<Select.Trigger id="monitor_type">
							<Select.Value
								bind:value={newMonitor.monitor_type}
								placeholder="Monitor Type"
							/>
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
								<Select.Item value="TCP" label="TCP" class="text-sm font-medium">
									TCP
								</Select.Item>
							</Select.Group>
						</Select.Content>
					</Select.Root>
				</div>
			</div>
			{#if newMonitor.monitor_type === "API"}
				<div class="mt-4 grid grid-cols-6 gap-2">
					<div class="col-span-1">
						<Label for="timeout">
							Timeout(ms)
							<span class="text-red-500">*</span>
						</Label>
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
						<Label for="url">URL <span class="text-red-500">*</span></Label>
						<Input
							bind:value={newMonitor.apiConfig.url}
							id="url"
							placeholder="https://example.com/api/users"
						/>
					</div>
					<div class="col-span-6 mt-2">
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
								class="absolute left-1/2 h-8 -translate-x-1/2  p-2 text-xs  "
							>
								<Plus class="mr-2 h-4 w-4" /> Add Header
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
						<p class="my-1 text-xs text-muted-foreground">
							You can write a custom eval function to evaluate the response. The
							function should return a promise that resolves to an object with status
							and latency. <a
								target="_blank"
								class="font-medium text-primary"
								href="https://kener.ing/docs/monitors-api#eval">Read the docs</a
							> to learn
						</p>
						<textarea
							bind:value={newMonitor.apiConfig.eval}
							id="eval"
							class="h-96 w-full rounded-sm border p-2"
							placeholder="Leave blank or write a custom eval function"
						></textarea>
					</div>
				</div>
			{:else if newMonitor.monitor_type == "PING"}
				<div class="mt-4 grid grid-cols-6 gap-2">
					<div class="col-span-6">
						<div class=" grid grid-cols-7 gap-2">
							{#each newMonitor.pingConfig.hosts as host, index}
								<div class="relative col-span-7 flex gap-x-2">
									<div>
										<Label for="xconfig_ip_type">Type</Label>
										<Select.Root
											portal={null}
											onSelectedChange={(e) => (host.type = e.value)}
											selected={{
												value: host.type,
												label: host.type
											}}
										>
											<Select.Trigger class="w-[150px]" id="xconfig_ip_type">
												<Select.Value
													bind:value={host.type}
													placeholder="IP Type"
												/>
											</Select.Trigger>
											<Select.Content>
												<Select.Group>
													<Select.Label>Type</Select.Label>
													<Select.Item
														value="IP4"
														label="IP4"
														class="text-sm font-medium"
													>
														IP4
													</Select.Item>
													<Select.Item
														value="IP6"
														label="IP6"
														class="text-sm font-medium"
													>
														IP6
													</Select.Item>
													<Select.Item
														value="DOMAIN"
														label="DOMAIN"
														class="text-sm font-medium"
													>
														DOMAIN
													</Select.Item>
												</Select.Group>
											</Select.Content>
										</Select.Root>
									</div>
									<div>
										<Label for="hostsV4">Host</Label>
										<Input
											bind:value={host.host}
											id="hostsV4"
											placeholder="172.12.14.42"
										/>
									</div>
									<div>
										<Label for="hostsV4timeout">Timeout</Label>
										<Input
											disabled={host.type == "IP6"}
											bind:value={host.timeout}
											id="hostsV4timeout"
											placeholder="timeout in ms ex 3000"
										/>
									</div>
									<div>
										<Label for="hostsV4count">Count</Label>
										<Input
											bind:value={host.count}
											id="hostsV4count"
											placeholder="number of pings ex 4"
										/>
									</div>
									<div>
										<Button
											class=" right-3 top-2 mt-8 h-6 w-6 p-1"
											variant="secondary"
											on:click={() => {
												newMonitor.pingConfig.hosts =
													newMonitor.pingConfig.hosts.filter(
														(_, i) => i !== index
													);
											}}
										>
											<X class="h-5 w-5" />
										</Button>
									</div>
								</div>
							{/each}
						</div>

						<div class="">
							<div class="">
								<Button
									class="mt-4 text-xs"
									variant="secondary"
									on:click={() => {
										newMonitor.pingConfig.hosts = [
											...newMonitor.pingConfig.hosts,
											{ host: "", timeout: 3000, count: 4, type: "IP4" }
										];
									}}
								>
									<Plus class="h-5 w-5" /> Add New
								</Button>
							</div>
						</div>
						<div class="mt-2">
							<Label for="pingEval">PING Eval</Label>
							<p class="my-1 text-xs text-muted-foreground">
								You can write a custom eval function to evaluate the response. The
								function should return a promise that resolves to an object with
								status and latency. <a
									target="_blank"
									class="font-medium text-primary"
									href="https://kener.ing/docs/monitors-ping#eval"
									>Read the docs</a
								> to learn
							</p>
							<textarea
								bind:value={newMonitor.pingConfig.pingEval}
								id="pingEval"
								class="h-96 w-full rounded-sm border p-2"
								placeholder="Leave blank or write a custom eval function"
							></textarea>
						</div>
					</div>
				</div>
			{:else if newMonitor.monitor_type == "TCP"}
				<div class="mt-4 grid grid-cols-6 gap-2">
					<div class="col-span-6">
						<div class=" grid grid-cols-7 gap-2">
							{#each newMonitor.tcpConfig.hosts as host, index}
								<div class="relative col-span-7 flex gap-x-2">
									<div>
										<Label for="xconfig_ip_type">Type</Label>
										<Select.Root
											portal={null}
											onSelectedChange={(e) => (host.type = e.value)}
											selected={{
												value: host.type,
												label: host.type
											}}
										>
											<Select.Trigger class="w-[150px]" id="xconfig_ip_type">
												<Select.Value
													bind:value={host.type}
													placeholder="IP Type"
												/>
											</Select.Trigger>
											<Select.Content>
												<Select.Group>
													<Select.Label>Type</Select.Label>
													<Select.Item
														value="IP4"
														label="IP4"
														class="text-sm font-medium"
													>
														IP4
													</Select.Item>
													<Select.Item
														value="IP6"
														label="IP6"
														class="text-sm font-medium"
													>
														IP6
													</Select.Item>
													<Select.Item
														value="DOMAIN"
														label="DOMAIN"
														class="text-sm font-medium"
													>
														DOMAIN
													</Select.Item>
												</Select.Group>
											</Select.Content>
										</Select.Root>
									</div>
									<div>
										<Label for="hostsV4">Host</Label>
										<Input
											bind:value={host.host}
											id="hostsV4"
											placeholder="172.12.14.42"
										/>
									</div>
									<div>
										<Label for="hostsV4port">Port</Label>
										<Input
											bind:value={host.port}
											id="hostsV4port"
											placeholder="port number ex 8080"
										/>
									</div>
									<div>
										<Label for="hostsV4timeout">Timeout</Label>
										<Input
											bind:value={host.timeout}
											id="hostsV4timeout"
											placeholder="timeout in ms ex 3000"
										/>
									</div>
									<div>
										<Button
											class="right-3 top-2 mt-8 h-6 w-6 p-1"
											variant="secondary"
											on:click={() => {
												newMonitor.tcpConfig.hosts =
													newMonitor.tcpConfig.hosts.filter(
														(_, i) => i !== index
													);
											}}
										>
											<X class="h-5 w-5" />
										</Button>
									</div>
								</div>
							{/each}
						</div>

						<div class="">
							<div class="">
								<Button
									class="mt-4 text-xs"
									variant="secondary"
									on:click={() => {
										newMonitor.tcpConfig.hosts = [
											...newMonitor.tcpConfig.hosts,
											{ host: "", timeout: 3000, type: "IP4", port: "" }
										];
									}}
								>
									<Plus class="h-5 w-5" /> Add New
								</Button>
							</div>
						</div>
						<div class="mt-2">
							<Label for="tcpEval">TCP Eval</Label>
							<p class="my-1 text-xs text-muted-foreground">
								You can write a custom eval function to evaluate the response. The
								function should return a promise that resolves to an object with
								status and latency. <a
									target="_blank"
									class="font-medium text-primary"
									href="https://kener.ing/docs/monitors-tcp#eval">Read the docs</a
								> to learn
							</p>
							<textarea
								bind:value={newMonitor.tcpConfig.tcpEval}
								id="tcpEval"
								class="h-96 w-full rounded-sm border p-2"
								placeholder="Leave blank or write a custom eval function"
							></textarea>
						</div>
					</div>
				</div>
			{:else if newMonitor.monitor_type == "DNS"}
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
						<Label for="values">Expected Values</Label>
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
		<div
			class="absolute bottom-0 grid h-16 w-full grid-cols-6 justify-end gap-2 border-t p-3 pr-6"
		>
			<div class="col-span-5 py-2.5">
				<p
					title={invalidFormMessage}
					class="overflow-x-hidden text-ellipsis whitespace-nowrap text-right text-xs font-medium text-red-500"
				>
					{invalidFormMessage}
				</p>
			</div>
			<div class="col-span-1">
				<Button
					class=" w-full"
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
