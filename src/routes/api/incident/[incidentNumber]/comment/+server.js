// @ts-nocheck
// @ts-ignore
import { json } from "@sveltejs/kit";
import { auth } from "$lib/server/webhook";
import { AddComment, GetCommentsForIssue } from "../../../../../../scripts/github";

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

	let resp = await GetCommentsForIssue(params.incidentNumber, params.owner, params.repo);

	return json(
        resp.map((comment) => {
            return {
                commentID: comment.id,
                body: comment.body,
                createdAt: Math.floor(new Date(comment.created_at).getTime() / 1000),
            };
        }),
        {
            status: 200,
        }
    );
}

export async function POST({ request, params }) {
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
    let body = payload.body; //string required

    if (!body || typeof body !== "string") {
        return json(
            { error: "Invalid body" },
            {
                status: 400,
            }
        );
    }

    let resp = await AddComment(params.owner, params.repo, params.incidentNumber, body);

    if (resp === null) {
        return json(
            { error: "github error" },
            {
                status: 400,
            }
        );
    }

    return json(
        {
            commentID: resp.id,
            body: resp.body,
            createdAt: Math.floor(new Date(resp.created_at).getTime() / 1000),
        },
        {
            status: 200,
        }
    );
}