// @ts-ignore
import { json, fail, error } from "@sveltejs/kit";
import fs from "fs-extra";


export async function POST({ request }) {
    const payload = await request.json();
	return json({
        day0: JSON.parse(fs.readFileSync(payload.day0, "utf8")),
    });
}
