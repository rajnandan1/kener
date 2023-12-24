// @ts-nocheck
import { env } from "$env/dynamic/public";
import fs from "fs-extra";
import { StatusColor, Badge } from "$lib/helpers.js";
const monitors = JSON.parse(fs.readFileSync(env.PUBLIC_KENER_FOLDER + "/monitors.json", "utf8"));
export async function GET({ params, setHeaders }) {
    // @ts-ignore
    const { path0Day, name } = monitors.find((monitor) => monitor.tag === params.tag);
    const dayData = JSON.parse(fs.readFileSync(path0Day, "utf8"));
    const lastObj = dayData[Object.keys(dayData)[Object.keys(dayData).length - 1]];

    

    return new Response(Badge(name, lastObj.status, StatusColor[lastObj.status]), {
        headers: {
            "Content-Type": "image/svg+xml",
        },
    });
}
