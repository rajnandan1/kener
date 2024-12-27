// @ts-nocheck
// @ts-ignore
import { json } from "@sveltejs/kit";
import { store, auth, GetMonitorStatusByTag } from "$lib/server/webhook";
export async function POST({ request }) {
	const payload = await request.json();
	const authError = await auth(request);
	if (authError !== null) {
		return json(
			{ error: authError.message },
			{
				status: 401
			}
		);
	}
	let resp = await store(payload);
	return json(resp, {
		status: resp.status
	});
}
export async function GET({ request, url }) {
	const authError = await auth(request);
	if (authError !== null) {
		return json(
			{ error: authError.message },
			{
				status: 401
			}
		);
	}
	const query = url.searchParams;
	const tag = query.get("tag");
	const timestamp = query.get("timestamp");
	if (!!!tag) {
		return json(
			{ error: "tag missing" },
			{
				status: 400
			}
		);
	}
	return json(await GetMonitorStatusByTag(tag, timestamp), {
		status: 200
	});
}
