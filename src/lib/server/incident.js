// @ts-nocheck

import axios from "axios";
import moment from "moment";
import Markdoc from "@markdoc/markdoc";
const GH_TOKEN = process.env.GH_TOKEN;
/**
 * @param {any} url
 */
function getAxiosOptions(url){
	const options = {
        url: url,
        method: "GET",
        headers: {
            Accept: "application/vnd.github+json",
            Authorization: "Bearer " + GH_TOKEN,
            "X-GitHub-Api-Version": "2022-11-28",
        },
    };
	return options;
}
function postAxiosOptions(url, data){
	const options = {
        url: url,
        method: "POST",
        headers: {
            Accept: "application/vnd.github+json",
            Authorization: "Bearer " + GH_TOKEN,
            "X-GitHub-Api-Version": "2022-11-28",
        },
		data: data
    };
	return options;
}
/**
 * @param {any} tagName
 * @param {{ owner: any; repo: any; }} githubConfig
 */
async function activeIncident(tagName, githubConfig) {
	const sinceHours = githubConfig.incidentSince || 24;
    const since = moment().subtract(sinceHours, "hours").toISOString();
	const url = `https://api.github.com/repos/${githubConfig.owner}/${githubConfig.repo}/issues?labels=${tagName},incident&state=open&sort=created&direction=desc&since=${since}`;
	try {
		const response = await axios.request(getAxiosOptions(url));
		return response.data;
	} catch (error) {
		console.log(error.response.data);
		return [];
	}
}
/**
 * @param {any} tagName
 * @param {{ owner: any; repo: any; }} githubConfig
 */
async function pastIncident(tagName, githubConfig) {
	const sinceHours = githubConfig.incidentSince || 24;
    const since = moment().subtract(sinceHours, "hours").toISOString();
	const url = `https://api.github.com/repos/${githubConfig.owner}/${githubConfig.repo}/issues?labels=${tagName},incident&state=closed&sort=created&direction=desc&since=${since}`;
	try {
		const response = await axios.request(getAxiosOptions(url));
		return response.data;
	} catch (error) {
		console.log(error.response.data);
		return [];
	}
}
/**
 * @param {any} tagName
 * @param {{ owner: any; repo: any; }} githubConfig
 */
async function hasActiveIncident(tagName, githubConfig) {
	
	const sinceHours = githubConfig.incidentSince || 24;
	const since = moment().subtract(sinceHours, "hours").toISOString();
	
	const url = `https://api.github.com/repos/${githubConfig.owner}/${githubConfig.repo}/issues?labels=${tagName},incident&state=open&sort=created&direction=desc&per_page=1&since=${since}`;
	try {
		const response = await axios.request(getAxiosOptions(url));
		return response.data.length > 0;
	} catch (error) {
		console.log(error.response.data);
		return false;
	}

}
/**
 * @param {any} issueID
 * @param {{ owner: any; repo: any; }} githubConfig
 */
async function getCommentsForIssue(issueID, githubConfig) {
	const url = `https://api.github.com/repos/${githubConfig.owner}/${githubConfig.repo}/issues/${issueID}/comments`;
	try {
		const response = await axios.request(getAxiosOptions(url));
		return response.data ;
	} catch (error) {
		console.log(error.response.data);
		return [];
	}
}	

async function createIssue(githubConfig, issueTitle, issueBody, issueLabels) {
	const url = `https://api.github.com/repos/${githubConfig.owner}/${githubConfig.repo}/issues`;
	try {
		const payload = {
			title: issueTitle,
			body: issueBody,
			labels: issueLabels,
		};
		const response = await axios.request(postAxiosOptions(url, payload));
		return response.data ;
	} catch (error) {
		console.log(error.response.data);
		return [];
	}
}

async function mapper(issue) {
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
        // @ts-ignore
        state: issue.state,
        closed_at: issue.closed_at,
        // @ts-ignore
        labels: issue.labels.map(function (label) {
            return label.name;
        }),
        html_url: issue.html_url,
        // @ts-ignore
        comments: comments.map((/** @type {{ body: string | import("markdown-it/lib/token")[]; created_at: any; updated_at: any; html_url: any; }} */ comment) => {
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
async function updateIssue(githubConfig, issueID) {

}
/*
{
	incident_type: "incident",
	start_time: "identified", //required
	end_time: "resolved",
	title: "title",
	description: "description",
	status:"degraded, down"
}
*/
 

export { activeIncident, hasActiveIncident, getCommentsForIssue, pastIncident, createIssue, mapper };
