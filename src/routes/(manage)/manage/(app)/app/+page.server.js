import { BASE_PATH } from "$lib/server/constants.js";

export async function load({ parent }) {
	return {
    basePath: BASE_PATH
	};
}
