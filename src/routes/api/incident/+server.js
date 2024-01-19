// @ts-nocheck
// @ts-ignore
import { json } from "@sveltejs/kit";
import { ParseIncidentPayload, auth, GHIssueToKenerIncident } from "$lib/server/webhook";
import { CreateIssue } from "../../../../scripts/github";
import { env } from "$env/dynamic/public";
import fs from "fs-extra";

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

    let { title, body, githubLabels, error } = ParseIncidentPayload(payload);
	if (error) {
		return json(
			{ error },
			{
				status: 400,
			}
		);
	}
	let site = JSON.parse(fs.readFileSync(env.PUBLIC_KENER_FOLDER + "/site.json", "utf8"));
    let github = site.github;
    let resp = await CreateIssue(github, title, body, githubLabels);
    if (resp === null) {
		
        return json(
            { error: "github error" },
            {
                status: 400,
            }
        );
    }
	
    return json(GHIssueToKenerIncident(resp), {
        status: 200,
    });
}