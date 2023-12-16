// @ts-nocheck

import axios from "axios";
import moment from "moment";
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
 

export { activeIncident, hasActiveIncident, getCommentsForIssue, pastIncident, createIssue };
