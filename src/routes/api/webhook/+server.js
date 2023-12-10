// @ts-nocheck
// @ts-ignore
import { json } from "@sveltejs/kit";
import { store } from "$lib/server/webhook";
export async function POST({ request }) {
	const payload = await request.json();
	// const headers = await request.headers();
	const authorization = request.headers.get('authorization');
	let ip = ""
	try {
		ip = request.headers.get("x-forwarded-for") || request.socket.remoteAddress || request.headers.get("x-real-ip")
	} catch(err){
		console.log("IP Not Found " + err.message)
	}
	let resp = store(payload, authorization, ip);
	return json(resp, {
        status: resp.status,
    });
}