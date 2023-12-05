import fs from "fs-extra";
import { FOLDER, FOLDER_MONITOR, FOLDER_SITE } from "./scripts/constants.js";

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
