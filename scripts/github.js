// @ts-nocheck
import axios from "axios";
import {GetMinuteStartNowTimestampUTC} from "./tool.js";

const GH_TOKEN = process.env.GH_TOKEN;

const GetAllGHLabels = async function (owner, repo) {
    const options = {
        method: "GET",
        url: `https://api.github.com/repos/${owner}/${repo}/labels`,
        headers: {
            Accept: "application/vnd.github+json",
            Authorization: "Bearer " + GH_TOKEN,
            "X-GitHub-Api-Version": "2022-11-28",
        },
    };

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
const CreateGHLabel = async function (owner, repo, label, description) {
    const options = {
        method: "POST",
        url: `https://api.github.com/repos/${owner}/${repo}/labels`,
        headers: {
            Accept: "application/vnd.github+json",
            Authorization: "Bearer " + GH_TOKEN,
            "X-GitHub-Api-Version": "2022-11-28",
        },
        data: {
            name: label,
            color: generateRandomColor(),
            description: description,
        },
    };

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
const GetIncidentsOpen = async function (tagName, githubConfig) {
    if (tagName === undefined) {
        return [];
    }
    if (githubConfig === undefined) {
        return [];
    }
    const since = GetMinuteStartNowTimestampUTC() - githubConfig.incidentSince * 60 * 60;
	const sinceISO = new Date(since * 1000).toISOString();
    const options = {
        method: "GET",
        url: `https://api.github.com/repos/${githubConfig.owner}/${githubConfig.repo}/issues?labels=${tagName},incident&state=open&sort=created&direction=desc&since=${sinceISO}`,
        headers: {
            Accept: "application/vnd.github+json",
            Authorization: "Bearer " + GH_TOKEN,
            "X-GitHub-Api-Version": "2022-11-28",
        },
    };
    try {
        const response = await axios.request(options);
        let issues = response.data;
        //issues.createAt should be after sinceISO
		issues = issues.filter((issue) => {
			return new Date(issue.created_at) >= new Date(sinceISO);
		});
		return issues;
    } catch (error) {
        console.log(error);
        return [];
    }
};
export {
    GetAllGHLabels,
    CreateGHLabel,
    GetIncidentsOpen,
    GetStartTimeFromBody,
    GetEndTimeFromBody,
};
