// @ts-nocheck
// @ts-ignore
import { json } from "@sveltejs/kit";
import { auth, ParseIncidentPayload, GHIssueToKenerIncident } from "$lib/server/webhook";
import { GetIncidentByNumber, UpdateIssue } from "../../../../../scripts/github";

export async function PATCH({ request, params }) {
	if (!params.incidentNumber || isNaN(params.incidentNumber)) {
        return json(
            { error: "Invalid incidentNumber" },
            {
                status: 400,
            }
        );
    }

	if (!params.owner) {
        return json(
            { error: "Invalid github owner" },
            {
                status: 400,
            }
        );
    }
    
	if (!params.repo) {
        return json(
            { error: "Invalid github repo" },
            {
                status: 400,
            }
        );
    }

    const authError = auth(request);

    if (authError !== null) {
        return json(
            { error: authError.message },
            {
                status: 401,
            }
        );
    }

	const payload = await request.json();

	let { title, body, githubLabels, error } = ParseIncidentPayload(payload);

    if (error) {
        return json(
            { error },
            {
                status: 400,
            }
        );
    }
	
	let resp = await UpdateIssue(params.owner, params.repo, params.incidentNumber, title, body, githubLabels);

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

export async function GET({ request, params }) {
    if (!params.incidentNumber || isNaN(params.incidentNumber)) {
        return json(
            { error: "Invalid incidentNumber" },
            {
                status: 400,
            }
        );
    }

	if (!params.owner) {
        return json(
            { error: "Invalid github owner" },
            {
                status: 400,
            }
        );
    }
    
	if (!params.repo) {
        return json(
            { error: "Invalid github repo" },
            {
                status: 400,
            }
        );
    }

	const authError = auth(request);

    if (authError !== null) {
        return json(
            { error: authError.message },
            {
                status: 401,
            }
        );
    }

	let issue = await GetIncidentByNumber(params.owner, params.repo, incidentNumber);

	if(issue === null){
		return json(
			{ error: "incident not found" },
			{
				status: 404,
			}
		);
	}	

    return json(GHIssueToKenerIncident(issue), {
        status: 200,
    });
}