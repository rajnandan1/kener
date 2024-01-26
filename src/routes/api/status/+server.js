// @ts-nocheck
// @ts-ignore
import { json } from "@sveltejs/kit";
import { store, auth } from "$lib/server/webhook";
export async function POST({ request }) {
    const payload = await request.json();
    const authError = auth(request);
    if (authError !== null) {
        return json(
            { error: authError.message },
            {
                status: 401,
            }
        );
    }
    let resp = store(payload);
    return json(resp, {
        status: resp.status,
    });
}
