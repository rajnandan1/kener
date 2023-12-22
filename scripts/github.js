// @ts-nocheck
import axios from "axios";
import {GetMinuteStartNowTimestampUTC} from "./tool.js";
import Markdoc from "@markdoc/markdoc";
const GH_TOKEN = process.env.GH_TOKEN;
/**
 * @param {any} url
 */
function getAxiosOptions(url) {
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
function postAxiosOptions(url, data) {
    const options = {
        url: url,
        method: "POST",
        headers: {
            Accept: "application/vnd.github+json",
            Authorization: "Bearer " + GH_TOKEN,
            "X-GitHub-Api-Version": "2022-11-28",
        },
        data: data,
    };
    return options;
}


const GetAllGHLabels = async function (owner, repo) {
    const options = getAxiosOptions(`https://api.github.com/repos/${owner}/${repo}/labels`);

    let labels = [];
    try {
        const response = await axios.request(options);
        labels = response.data.map((label) => label.name);
    } catch (error) {
        console.log(error.response.data);
        return [];
    }
    return labels;
};
function generateRandomColor() {
    var randomColor = Math.floor(Math.random() * 16777215).toString(16);
    return randomColor;
    //random color will be freshly served
}
const CreateGHLabel = async function (owner, repo, label, description, color) {
	if(color === undefined){
		color = generateRandomColor();
	}

	const options = postAxiosOptions(`https://api.github.com/repos/${owner}/${repo}/labels`, {
        name: label,
        color: color,
        description: description,
    });
    try {
        const response = await axios.request(options);
        return response.data;
    } catch (error) {
        console.log(error.response.data);
        return null;
    }
};
const GetStartTimeFromBody = function (text) {
    const pattern = /\[start_datetime:(\d+)\]/;

    const matches = pattern.exec(text);

    if (matches) {
        const timestamp = matches[1];
        return parseInt(timestamp);
    }
    return null;
};
const GetEndTimeFromBody = function (text) {
    const pattern = /\[end_datetime:(\d+)\]/;

    const matches = pattern.exec(text);

    if (matches) {
        const timestamp = matches[1];
        return parseInt(timestamp);
    }
    return null;
};
const GetIncidents = async function (tagName, githubConfig, state = "all") {
    if (tagName === undefined) {
        return [];
    }
    if (githubConfig === undefined) {
        return [];
    }
    const since = GetMinuteStartNowTimestampUTC() - githubConfig.incidentSince * 60 * 60;
	const sinceISO = new Date(since * 1000).toISOString();
	const url = `https://api.github.com/repos/${githubConfig.owner}/${githubConfig.repo}/issues?state=${state}&labels=${tagName},incident&sort=created&direction=desc&since=${sinceISO}`;
    const options = getAxiosOptions(url);
    try {
        const response = await axios.request(options);
        let issues = response.data;
        //issues.createAt should be after sinceISO
		issues = issues.filter((issue) => {
			return new Date(issue.created_at) >= new Date(sinceISO);
		});
		return issues;
    } catch (error) {
        //console.log(error.message, options, url);
        return [];
    }
};

async function Mapper(issue) {
    const ast = Markdoc.parse(issue.body);
    const content = Markdoc.transform(ast);
    const html = Markdoc.renderers.html(content);
    const comments = await GetCommentsForIssue(issue.number, this.github);

	//convert issue.created_at from iso to timestamp  UTC minutes
	const issueCreatedAt = new Date(issue.created_at);
	const issueCreatedAtTimestamp = issueCreatedAt.getTime() / 1000;

	//convert issue.closed_at from iso to timestamp UTC minutes
	let issueClosedAtTimestamp = null;
	if(issue.closed_at !== null){
		const issueClosedAt = new Date(issue.closed_at);
		issueClosedAtTimestamp = issueClosedAt.getTime() / 1000;
	}

	
    return {
        title: issue.title,
        incident_start_time: GetStartTimeFromBody(issue.body) || issueCreatedAtTimestamp,
		incident_end_time: GetEndTimeFromBody(issue.body) || issueClosedAtTimestamp,
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
async function GetCommentsForIssue(issueID, githubConfig) {
    const url = `https://api.github.com/repos/${githubConfig.owner}/${githubConfig.repo}/issues/${issueID}/comments`;
    try {
        const response = await axios.request(getAxiosOptions(url));
        return response.data;
    } catch (error) {
        console.log(error.response.data);
        return [];
    }
}	
async function CreateIssue(githubConfig, issueTitle, issueBody, issueLabels) {
    const url = `https://api.github.com/repos/${githubConfig.owner}/${githubConfig.repo}/issues`;
    try {
        const payload = {
            title: issueTitle,
            body: issueBody,
            labels: issueLabels,
        };
        const response = await axios.request(postAxiosOptions(url, payload));
        return response.data;
    } catch (error) {
        console.log(error.response.data);
        return [];
    }
}
export { GetAllGHLabels, CreateGHLabel, GetIncidents, GetStartTimeFromBody, GetEndTimeFromBody, GetCommentsForIssue, Mapper };
