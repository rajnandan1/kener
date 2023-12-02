// @ts-nocheck

import axios from "axios";
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
/**
 * @param {any} tagName
 * @param {{ owner: any; repo: any; }} githubConfig
 */
async function activeIncident(tagName, githubConfig) {

	const url = `https://api.github.com/repos/${githubConfig.owner}/${githubConfig.repo}/issues?labels=${tagName},status&state=open&sort=created&direction=desc`;
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
	const url = `https://api.github.com/repos/${githubConfig.owner}/${githubConfig.repo}/issues?labels=${tagName},status&state=closed&sort=created&direction=desc`;
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
	const url = `https://api.github.com/repos/${githubConfig.owner}/${githubConfig.repo}/issues?labels=${tagName},status&state=open&sort=created&direction=desc&per_page=1`;
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

 

export { activeIncident, hasActiveIncident, getCommentsForIssue, pastIncident };
