import { MONITOR, SITE } from "./constants.js";
import axios from "axios";

const GH_TOKEN = process.env.GH_TOKEN;
const IsValidURL = function (url) {
    return /^(http|https):\/\/[^ "]+$/.test(url);
};
const IsValidHTTPMethod = function (method) {
    return /^(GET|POST|PUT|DELETE|HEAD|OPTIONS|PATCH)$/.test(method);
};
function generateRandomColor() {
    var randomColor =  Math.floor(Math.random() * 16777215).toString(16);
    return randomColor;
    //random color will be freshly served
}
const LoadMonitorsPath = function () {
    const argv = process.argv;

    if (!!process.env.MONITOR_YAML_PATH) {
        return process.env.MONITOR_YAML_PATH;
    }

    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        if (arg === "--monitors") {
            return argv[i + 1];
        }
    }

    return MONITOR;
};
const LoadSitePath = function () {
    const argv = process.argv;

    if (!!process.env.SITE_YAML_PATH) {
        return process.env.SITE_YAML_PATH;
    }

    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        if (arg === "--site") {
            return argv[i + 1];
        }
    }

    return SITE;
};
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
}
export { IsValidURL, IsValidHTTPMethod, LoadMonitorsPath, LoadSitePath, GetAllGHLabels, CreateGHLabel };
