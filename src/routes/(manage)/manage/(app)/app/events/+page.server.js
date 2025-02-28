import { BASE_PATH } from "$lib/server/constants.js";
import { GetMonitors } from "$lib/server/controllers/controller.js";

export async function load({ parent }) {
	let monitors = await GetMonitors({ status: "ACTIVE" });
	return {
    basePath: BASE_PATH,
		monitors: monitors
	};
}
