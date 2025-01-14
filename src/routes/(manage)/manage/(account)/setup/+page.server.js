import dotenv from "dotenv";
dotenv.config();

export async function load({ params, route, url, parent }) {
	//read query parameters
	const query = url.searchParams;
	return {
		error: query.get("error"),
		isSecretSet: !!process.env.KENER_SECRET_KEY,
		isOriginSet: !!process.env.ORIGIN
	};
}
