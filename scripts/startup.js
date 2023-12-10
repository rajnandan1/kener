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
import { MONITOR, SITE, FOLDER, FOLDER_MONITOR, FOLDER_SITE, API_TIMEOUT } from "./constants.js";
import { IsValidURL, IsValidHTTPMethod } from "./tool.js";
import { OneMinuteFetch } from "./cron-minute.js";
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

if (!fs.existsSync(FOLDER_SITE)) {
    fs.writeFileSync(FOLDER_SITE, JSON.stringify({}));
    console.log("site.json file created successfully!");
}

if (!fs.existsSync(FOLDER_MONITOR)) {
    fs.writeFileSync(FOLDER_MONITOR, JSON.stringify([]));
    console.log("monitors.json file created successfully!");
}
if (!fs.existsSync(FOLDER_MONITOR)) {
    fs.writeFileSync(FOLDER_MONITOR, JSON.stringify([]));
    console.log("monitors.json file created successfully!");
}




const Startup = async () => {
    try {
        const fileContent = fs.readFileSync(MONITOR, "utf8");
        site = yaml.load(fs.readFileSync(SITE, "utf8"));
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
        let url = monitor.url;
        let method = monitor.method;
        let tag = monitor.tag;
		let hasAPI = false;
        let folderName = name.replace(/[^a-z0-9]/gi, "-").toLowerCase();
        monitors[i].folderName = folderName;

        if (!name || !tag) {
            console.log("name, tag are required");
            process.exit(1);
        }

		if (!!url) {
			if (!IsValidURL(url)) {
				console.log("url is not valid");
				process.exit(1);	
			}
			hasAPI = true;
        } 

		if (!!method && hasAPI) {
			if (!IsValidHTTPMethod(method)) {
				console.log("method is not valid");
				process.exit(1);	
			}
			method = method.toUpperCase();
        } else {
			method = "GET";
		}

        if (monitor.eval === undefined || monitor.eval === null) {
            monitors[i].eval = defaultEval;
        }
        if (monitor.headers === undefined || monitor.headers === null) {
            monitors[i].headers = undefined;
        }
        if (monitor.body === undefined || monitor.body === null) {
            monitors[i].body = undefined;
        }
        if (monitor.timeout === undefined || monitor.timeout === null) {
            monitors[i].timeout = API_TIMEOUT;
        }

        monitors[i].path0Day = `${FOLDER}/${folderName}-day-json.json`;
        monitors[i].hasAPI = hasAPI;

        //secrets can be in url/body/headers
        //match in monitor.url if a words starts with $, get the word
        const requiredSecrets = getWordsStartingWithDollar(`${monitor.url} ${monitor.body} ${JSON.stringify(monitor.headers)}`).map((x) => x.substr(1));

        // const requiredSecrets = ["X_CLIENT_ID", "X_CLIENT_SECRET"];
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

    // init monitors
    for (let i = 0; i < monitors.length; i++) {
        const monitor = monitors[i];
		if (!monitor.hasAPI) {
			continue;
		}
        console.log("Staring One Minute Cron for ", monitor.path0Day);
        await OneMinuteFetch(envSecrets, monitor.url, monitor.method, JSON.stringify(monitor.headers), monitor.body, monitor.timeout, monitor.eval, monitor.path0Day);
    }

    //trigger minute cron

    for (let i = 0; i < monitors.length; i++) {
        const monitor = monitors[i];
        if (!monitor.hasAPI) {
			continue;
		}
        let cronExpession = "* * * * *";
        if (monitor.cron !== undefined && monitor.cron !== null) {
            cronExpession = monitor.cron;
        }
		console.log("Staring " + cronExpession + " Cron for ", monitor.name);
        Cron(cronExpession, async () => {
            OneMinuteFetch(envSecrets, monitor.url, monitor.method, JSON.stringify(monitor.headers), monitor.body, monitor.timeout, monitor.eval, monitor.path0Day);
        });
    }
};

export { Startup };