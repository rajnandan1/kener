// @ts-nocheck
// @ts-ignore
import { json } from "@sveltejs/kit";
import { env } from "$env/dynamic/public";
import fs from "fs-extra";
import { GetCommentsForIssue } from "../../../../../scripts/github.js";
import { marked } from "marked";

export async function GET({ params, }) {
    const incidentNumber = params.id;
	let siteData = JSON.parse(fs.readFileSync(env.PUBLIC_KENER_FOLDER + "/site.json", "utf8"));
    let comments = await GetCommentsForIssue(incidentNumber, siteData.github);
    comments = comments.map((/** @type {{ body: string | import("markdown-it/lib/token")[]; created_at: any; updated_at: any; html_url: any; }} */ comment) => {
        const html = marked.parse(comment.body);
        return {
            body: html,
            created_at: comment.created_at,
            updated_at: comment.updated_at,
            html_url: comment.html_url,
        };
    });

    return json(comments);
}
