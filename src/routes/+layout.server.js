import fs from "fs-extra";
import { env } from "$env/dynamic/public";

// console.log(tz);
export async function load({ params, route, url, cookies }) {
    const tzOffsetCookie = cookies.get("tzOffset");
    var dt = new Date();
    let tzOffset = dt.getTimezoneOffset(); // -480
    if (!!tzOffsetCookie) {
        tzOffset = Number(tzOffsetCookie);
    }
    let site = JSON.parse(fs.readFileSync(env.PUBLIC_KENER_FOLDER + "/site.json", "utf8"));
    return {
        site: site,
        tzOffset,
    };
}
