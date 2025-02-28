import dotenv from "dotenv";
import { BASE_PATH } from "$lib/server/constants.js";

dotenv.config();

export async function load({ params, route, url, parent }) {
	//read query parameters
	const query = url.searchParams;
	return {
    basePath: BASE_PATH,
		error: query.get("error"),
		isSecretSet: !!process.env.KENER_SECRET_KEY,
		isOriginSet: !!process.env.ORIGIN
	};
}
