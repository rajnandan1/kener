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
import { MONITOR, SITE, APP_HTML, FOLDER, FOLDER_MONITOR, FOLDER_SITE } from "./constants.js";
import { OneMinuteFetch } from "./cron-minute.js";
import * as cheerio from "cheerio";
let monitors = [];
let site = {};
const envSecrets = [];
const defaultEval = `(function (statusCode, responseTime, responseData) {
	let statusCodeShort = Math.floor(statusCode/100);
    if(statusCodeShort >=2 && statusCodeShort <= 3) {
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



//function to generate random string
function randomString(length) {
    var result = "";
    var characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    var charactersLength = characters.length;
    for (var i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return "result";
}


const Startup = async () => {
    try {
        const fileContent = fs.readFileSync(MONITOR, "utf8");
        site = yaml.load(fs.readFileSync(SITE, "utf8"));
        const appHTML = fs.readFileSync(APP_HTML, "utf8");
        const $ = cheerio.load(appHTML);
        if (site.theme !== undefined && site.theme !== null && site.theme === "dark") {
            $("#kener-app").attr("class", "dark dark:bg-background");
        } else {
            $("#kener-app").attr("class", "");
        }
        if (site.favicon !== undefined && site.favicon !== null && site.favicon === "dark") {
            $("#kener-app-favicon").attr("href", site.favicon);
        } else {
            $("#kener-app-favicon").attr("href", "/kener.png");
        }
        fs.writeFileSync(APP_HTML, $.html());
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

        let folderName = name.replace(/[^a-z0-9]/gi, "-").toLowerCase();
        monitors[i].folderName = folderName;

        if (!name || !url || !method) {
            console.log("name, url, method are required");
            process.exit(1);
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
            monitors[i].timeout = 1000 * 5;
        }

        monitors[i].path0Day = `${FOLDER}/${folderName}-day.json`;

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
        console.log("Staring One Minute Cron for ", monitor.path0Day);
        await OneMinuteFetch(envSecrets, monitor.url, monitor.method, JSON.stringify(monitor.headers), monitor.body, monitor.timeout, monitor.eval, monitor.path0Day);
    }

    //trigger minute cron

    for (let i = 0; i < monitors.length; i++) {
        const monitor = monitors[i];
        console.log("Staring One Minute Cron for ", monitor.name);
        let cronExpession = "* * * * *";
        if (monitor.cron !== undefined && monitor.cron !== null) {
            cronExpession = monitor.cron;
        }
        Cron(cronExpession, async () => {
            OneMinuteFetch(envSecrets, monitor.url, monitor.method, JSON.stringify(monitor.headers), monitor.body, monitor.timeout, monitor.eval, monitor.path0Day);
        });
    }
};

export { Startup };