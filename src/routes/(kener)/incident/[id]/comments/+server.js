// @ts-nocheck
// @ts-ignore
import { json } from "@sveltejs/kit";
import { GetCommentsForIssue } from "$lib/server/github.js";
import { marked } from "marked";
export async function GET({ params }) {
	const incident_number = params.id;
	let comments = await GetCommentsForIssue(incident_number);
	comments = comments.map(
		(
			/** @type {{ body: string | import("markdown-it/lib/token")[]; created_at: any; updated_at: any; html_url: any; }} */ comment
		) => {
			const html = marked.parse(comment.body);
			return {
				body: html,
				created_at: comment.created_at,
				updated_at: comment.updated_at,
				html_url: comment.html_url
			};
		}
	);

	return json(comments);
}
