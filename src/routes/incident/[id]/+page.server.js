import monitors from "$lib/.kener/monitors.json";
import { activeIncident, getCommentsForIssue, pastIncident } from "$lib/server/incident";
import Markdoc from "@markdoc/markdoc";

async function mapper(issue){
	const ast = Markdoc.parse(issue.body);
    const content = Markdoc.transform(ast);
    const html = Markdoc.renderers.html(content);
    const comments = await getCommentsForIssue(issue.number, this.github);
    return {
        title: issue.title,
        number: issue.number,
        body: html,
        created_at: issue.created_at,
        updated_at: issue.updated_at,
		collapsed: true,
        comments: issue.comments,
        html_url: issue.html_url,
        comments: comments.map((comment) => {
            const ast = Markdoc.parse(comment.body);
            const content = Markdoc.transform(ast);
            const html = Markdoc.renderers.html(content);
            return {
                body: html,
                created_at: comment.created_at,
                updated_at: comment.updated_at,
                html_url: comment.html_url,
            };
        }),
    };
}

export async function load({ params, route, url, parent }) {
    const siteData = await parent();
    const github = siteData.site.github;
	const { description, name, tag } = monitors.find((monitor) => monitor.folderName === params.id);
	const gitHubActiveIssues = await activeIncident(tag, github);
	const gitHubPastIssues = await pastIncident(tag, github);
    return {
        issues: params.id,
        githubConfig: github,
        monitor: { description, name },
        activeIncidents: await Promise.all(gitHubActiveIssues.map(mapper, { github })),
        pastIncidents: await Promise.all(gitHubPastIssues.map(mapper, { github })),
    };
}
