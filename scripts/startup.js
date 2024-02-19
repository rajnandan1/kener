/*
The startup js script will
check if monitors.yaml exists
if it does, it will read the file and parse it into a json array of objects
each objects will have a name, url, method: required
name of each of these objects need to be unique
*/
import fs from "fs-extra";
import yaml from "js-yaml";
import { Cron } from "croner";
import { FOLDER, FOLDER_MONITOR, FOLDER_SITE, API_TIMEOUT } from "./constants.js";
import { IsValidURL, IsValidHTTPMethod, LoadMonitorsPath, LoadSitePath } from "./tool.js";
import { GetAllGHLabels, CreateGHLabel } from "./github.js";
import { Minuter } from "./cron-minute.js";
import axios from "axios";
import { Ninety } from "./ninety.js";
let monitors = [];
let site = {};
const envSecrets = [];
const defaultEval = `(function (statusCode, responseTime, responseData) {
	let statusCodeShort = Math.floor(statusCode/100);
    if(statusCode == 429 || (statusCodeShort >=2 && statusCodeShort <= 3)) {
        return {
			status: 'UP',
			latency: responseTime,
        }
    } 
	return {
		status: 'DOWN',
		latency: responseTime,
	}
})`;

function checkIfDuplicateExists(arr) {
    return new Set(arr).size !== arr.length;
}
function getWordsStartingWithDollar(text) {
    const regex = /\$\w+/g;
    const wordsArray = text.match(regex);
    return wordsArray || [];
}
if (!fs.existsSync(FOLDER)) {
    fs.mkdirSync(FOLDER);
    console.log(".kener folder created successfully!");
}

const Startup = async () => {
    try {
        const fileContent = fs.readFileSync(LoadMonitorsPath(), "utf8");
        site = yaml.load(fs.readFileSync(LoadSitePath(), "utf8"));
        monitors = yaml.load(fileContent);
    } catch (error) {
        console.log(error);
        process.exit(1);
    }

    // Use the 'monitors' array of JSON objects as needed
    //check if each object has name, url, method
    //if not, exit with error
    //if yes, check if name is unique

    for (let i = 0; i < monitors.length; i++) {
        const monitor = monitors[i];
        let name = monitor.name;
        let tag = monitor.tag;
        let hasAPI = monitor.api !== undefined && monitor.api !== null;
        let folderName = name.replace(/[^a-z0-9]/gi, "-").toLowerCase();
        monitors[i].folderName = folderName;

        if (!name || !tag) {
            console.log("name, tag are required");
            process.exit(1);
        }

		if(hasAPI) {
            let url = monitor.api.url;
            let method = monitor.api.method;
            let headers = monitor.api.headers;
            let evaluator = monitor.api.eval;
            let body = monitor.api.body;
            let timeout = monitor.api.timeout;
            //url
            if (!!url) {
                if (!IsValidURL(url)) {
                    console.log("url is not valid");
                    process.exit(1);
                }
            }
            if (!!method) {
                if (!IsValidHTTPMethod(method)) {
                    console.log("method is not valid");
                    process.exit(1);
                }
                method = method.toUpperCase();
            } else {
                method = "GET";
            }
            monitors[i].api.method = method;
            //headers
            if (headers === undefined || headers === null) {
                monitors[i].api.headers = undefined;
            } else {
                //check if headers is a valid json
                try {
                    JSON.parse(JSON.stringify(headers));
                } catch (error) {
                    console.log("headers are not valid. Quiting");
                    process.exit(1);
                }
            }
            //eval
            if (evaluator === undefined || evaluator === null) {
                monitors[i].api.eval = defaultEval;
            } else {
                let evalResp = eval(evaluator + `(200, 1000, "e30=")`);
				
                if (evalResp === undefined || evalResp === null || evalResp.status === undefined || evalResp.status === null || evalResp.latency === undefined || evalResp.latency === null) {
                    console.log("eval is not valid ");
                    process.exit(1);
                }
				monitors[i].api.eval = evaluator;
            }
            //body
            if (body === undefined || body === null) {
                monitors[i].api.body = undefined;
            } else {
                //check if body is a valid string
                if (typeof body !== "string") {
                    console.log("body is not valid should be a string");
                    process.exit(1);
                }
            }
            //timeout
            if (timeout === undefined || timeout === null) {
                monitors[i].api.timeout = API_TIMEOUT;
            } else {
                //check if timeout is a valid number
                if (isNaN(timeout) || timeout < 0) {
                    console.log("timeout is not valid ");
                    process.exit(1);
                }
            }

            //add a description to the monitor if it is website using api.url and method = GET and headers == undefined
            //call the it to see if recevied content-type is text/html
            //if yes, append to description
            if ((headers === undefined || headers === null) && url !== undefined && method === "GET") {
                
                try {
                    const response = await axios({
                        method: "GET",
                        url: url,
                        timeout: API_TIMEOUT,
                    });
                    if (response.headers["content-type"].includes("text/html")) {
						let link = `<a href="${url}" class="font-medium underline underline-offset-4" target="_blank">${url}</a>`;
						if(monitors[i].description === undefined) {
							monitors[i].description = link; 
						} else {
							monitors[i].description = monitors[i].description?.trim() + " " + link; 
						}
                        
                    }
                } catch (error) {
                    console.log(error);
                }
            }
        }

        monitors[i].path0Day = `${FOLDER}/${folderName}.0day.utc.json`;
        monitors[i].path90Day = `${FOLDER}/${folderName}.90day.utc.json`;
        monitors[i].hasAPI = hasAPI;

        //secrets can be in url/body/headers
        //match in monitor.url if a words starts with $, get the word
        const requiredSecrets = getWordsStartingWithDollar(`${monitor.url} ${monitor.body} ${JSON.stringify(monitor.headers)}`).map((x) => x.substr(1));

        //iterate over process.env
        for (const [key, value] of Object.entries(process.env)) {
            if (requiredSecrets.indexOf(key) !== -1) {
                envSecrets.push({
                    find: `$${key}`,
                    replace: value,
                });
            }
        }
    }
    if (site.github === undefined || site.github.owner === undefined || site.github.repo === undefined) {
        console.log("github owner and repo are required");
        process.exit(1);
    }
    if (site.github.incidentSince === undefined || site.github.incidentSince === null) {
        site.github.incidentSince = 48;
    }
    if (checkIfDuplicateExists(monitors.map((monitor) => monitor.folderName)) === true) {
        console.log("duplicate monitor detected");
        process.exit(1);
    }
    if (checkIfDuplicateExists(monitors.map((monitor) => monitor.tag)) === true) {
        console.log("duplicate tag detected");
        process.exit(1);
    }

    fs.ensureFileSync(FOLDER_MONITOR);
    fs.ensureFileSync(FOLDER_SITE);

    try {
        fs.writeFileSync(FOLDER_MONITOR, JSON.stringify(monitors, null, 4));
        fs.writeFileSync(FOLDER_SITE, JSON.stringify(site, null, 4));
    } catch (error) {
        console.log(error);
        process.exit(1);
    }

    if (!!site.github && !!site.github.owner && !!site.github.repo) {
        const ghowner = site.github.owner;
        const ghrepo = site.github.repo;
        const ghlabels = await GetAllGHLabels(ghowner, ghrepo);
        const tagsAndDescription = monitors.map((monitor) => {
            return { tag: monitor.tag, description: monitor.name };
        });
        //add incident label if does not exist

        if (ghlabels.indexOf("incident") === -1) {
            await CreateGHLabel(ghowner, ghrepo, "incident", "Status of the site");
        }
        if (ghlabels.indexOf("resolved") === -1) {
            await CreateGHLabel(ghowner, ghrepo, "resolved", "Incident is resolved", "65dba6");
        }
        if (ghlabels.indexOf("identified") === -1) {
            await CreateGHLabel(ghowner, ghrepo, "identified", "Incident is Identified", "EBE3D5");
        }
        if (ghlabels.indexOf("investigating") === -1) {
            await CreateGHLabel(ghowner, ghrepo, "investigating", "Incident is investigated", "D4E2D4");
        }
        if (ghlabels.indexOf("incident-degraded") === -1) {
            await CreateGHLabel(ghowner, ghrepo, "incident-degraded", "Status is degraded of the site", "f5ba60");
        }
        if (ghlabels.indexOf("incident-down") === -1) {
            await CreateGHLabel(ghowner, ghrepo, "incident-down", "Status is down of the site", "ea3462");
        }
        //add tags if does not exist
        for (let i = 0; i < tagsAndDescription.length; i++) {
            const tag = tagsAndDescription[i].tag;
            const description = tagsAndDescription[i].description;
            if (ghlabels.indexOf(tag) === -1) {
                await CreateGHLabel(ghowner, ghrepo, tag, description);
            }
        }
    }

    // init monitors
    for (let i = 0; i < monitors.length; i++) {
        const monitor = monitors[i];
        if (!fs.existsSync(monitor.path0Day)) {
            fs.ensureFileSync(monitor.path0Day);
            fs.writeFileSync(monitor.path0Day, JSON.stringify({}));
        }
        if (!fs.existsSync(monitor.path90Day)) {
            fs.ensureFileSync(monitor.path90Day);
            fs.writeFileSync(monitor.path90Day, JSON.stringify({}));
        }

        console.log("Initial Fetch for ", monitor.name);
        await Minuter(envSecrets, monitor, site.github);
		await Ninety(monitor);
    }

    //trigger minute cron

    for (let i = 0; i < monitors.length; i++) {
        const monitor = monitors[i];

        let cronExpession = "* * * * *";
        if (monitor.cron !== undefined && monitor.cron !== null) {
            cronExpession = monitor.cron;
        }
        console.log("Staring " + cronExpession + " Cron for ", monitor.name);
        Cron(cronExpession, async () => {
            await Minuter(envSecrets, monitor, site.github);
        });
    }

	//pre compute 90 day data at 1 minute interval
	Cron(
        "* * * * *",
        async () => {
            for (let i = 0; i < monitors.length; i++) {
                const monitor = monitors[i];
                Ninety(monitor);
            }
        },
        {
            protect: true,
        }
    );
	
};

export { Startup };
